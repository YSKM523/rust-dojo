use crate::core::{
    progress::{filter_known_progress_ids, is_known_progress_id},
    session::SessionPayload,
};
use crate::routes::{env_string, json, now_ms, trim_ecmascript};
use serde::Deserialize;
use serde_json::{json as json_value, Value};
use worker::{D1Database, Env, Request, Response, Result};

#[derive(Deserialize)]
struct ProgressRow {
    exercise_id: String,
}

pub async fn list(req: Request, env: Env) -> Result<Response> {
    let (db, session) = match authenticated(&req, &env) {
        Ok(auth) => auth,
        Err(response) => return Ok(response),
    };
    json(
        200,
        json_value!({ "ids": list_progress(&db, &session.uid).await? }),
    )
}

pub async fn upsert(mut req: Request, env: Env) -> Result<Response> {
    let (db, session) = match authenticated(&req, &env) {
        Ok(auth) => auth,
        Err(response) => return Ok(response),
    };
    let body: Value = match req.json().await {
        Ok(body) => body,
        Err(_) => return json(400, json_value!({ "error": "请求格式错误" })),
    };
    let id = trim_ecmascript(body.get("exerciseId").and_then(Value::as_str).unwrap_or(""));
    if id.is_empty() || !is_known_progress_id(id) {
        return json(400, json_value!({ "error": "无效 exerciseId" }));
    }
    upsert_progress(&db, &session.uid, id, now_ms()).await?;
    json(200, json_value!({ "ok": true }))
}

pub async fn delete(mut req: Request, env: Env) -> Result<Response> {
    let (db, session) = match authenticated(&req, &env) {
        Ok(auth) => auth,
        Err(response) => return Ok(response),
    };
    let body: Value = match req.json().await {
        Ok(body) => body,
        Err(_) => return json(400, json_value!({ "error": "请求格式错误" })),
    };
    let id = trim_ecmascript(body.get("exerciseId").and_then(Value::as_str).unwrap_or(""));
    if id.is_empty() || !is_known_progress_id(id) {
        return json(400, json_value!({ "error": "无效 exerciseId" }));
    }
    db.prepare("DELETE FROM progress WHERE user_id = ? AND exercise_id = ?")
        .bind(&[
            worker::wasm_bindgen::JsValue::from_str(&session.uid),
            worker::wasm_bindgen::JsValue::from_str(id),
        ])?
        .run()
        .await?;
    json(200, json_value!({ "ok": true }))
}

pub async fn sync(mut req: Request, env: Env) -> Result<Response> {
    let (db, session) = match authenticated(&req, &env) {
        Ok(auth) => auth,
        Err(response) => return Ok(response),
    };
    let body: Value = req
        .json()
        .await
        .unwrap_or(Value::Object(Default::default()));
    let empty = Vec::new();
    let ids = body.get("ids").and_then(Value::as_array).unwrap_or(&empty);
    let ids = filter_known_progress_ids(ids);
    let merged = merge_progress(&db, &session.uid, &ids, now_ms()).await?;
    json(200, json_value!({ "ids": merged }))
}

fn authenticated(
    req: &Request,
    env: &Env,
) -> std::result::Result<(D1Database, SessionPayload), Response> {
    let (Ok(db), Some(secret)) = (env.d1("DB"), env_string(env, "SESSION_SECRET")) else {
        return Err(
            json(503, json_value!({ "error": "未配置" })).expect("JSON response serializes")
        );
    };
    let token = req
        .headers()
        .get("cookie")
        .ok()
        .flatten()
        .and_then(|header| {
            header
                .split(';')
                .filter_map(|part| part.trim().split_once('='))
                .find_map(|(name, value)| (name == "rdsess").then(|| value.to_owned()))
        });
    let Some(session) = token
        .as_deref()
        .and_then(|token| crate::core::session::verify_session(token, &secret, now_ms()))
    else {
        return Err(
            json(401, json_value!({ "error": "未登录" })).expect("JSON response serializes")
        );
    };
    Ok((db, session))
}

async fn list_progress(db: &D1Database, user_id: &str) -> Result<Vec<String>> {
    let result = db
        .prepare("SELECT exercise_id FROM progress WHERE user_id = ?")
        .bind(&[worker::wasm_bindgen::JsValue::from_str(user_id)])?
        .all()
        .await?;
    Ok(result
        .results::<ProgressRow>()?
        .into_iter()
        .map(|row| row.exercise_id)
        .collect())
}

async fn upsert_progress(
    db: &D1Database,
    user_id: &str,
    exercise_id: &str,
    now: i64,
) -> Result<()> {
    db.prepare("INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING")
        .bind(&[
            worker::wasm_bindgen::JsValue::from_str(user_id),
            worker::wasm_bindgen::JsValue::from_str(exercise_id),
            worker::wasm_bindgen::JsValue::from_f64(now as f64),
        ])?
        .run()
        .await?;
    Ok(())
}

async fn merge_progress(
    db: &D1Database,
    user_id: &str,
    ids: &[String],
    now: i64,
) -> Result<Vec<String>> {
    if !ids.is_empty() {
        let statement = db.prepare("INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING");
        let statements = ids
            .iter()
            .map(|id| {
                statement.clone().bind(&[
                    worker::wasm_bindgen::JsValue::from_str(user_id),
                    worker::wasm_bindgen::JsValue::from_str(id),
                    worker::wasm_bindgen::JsValue::from_f64(now as f64),
                ])
            })
            .collect::<Result<Vec<_>>>()?;
        db.batch(statements).await?;
    }
    list_progress(db, user_id).await
}
