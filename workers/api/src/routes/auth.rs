use crate::core::{
    code::{code_from, evaluate_code, is_valid_email, CodeRow, CodeVerdict},
    email::build_otp_email,
    ratelimit::{decide, rl_key},
    session::{sign_session, verify_session, SessionPayload},
};
use crate::routes::{env_string, json, now_ms, trim_ecmascript, utc_day};
use serde::Deserialize;
use serde_json::{json as json_value, Value};
use worker::{D1Database, Env, Fetcher, KvStore, Method, Request, RequestInit, Response, Result};

const CODE_TTL_MS: i64 = 10 * 60 * 1000;
const SESSION_TTL_MS: i64 = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS: i64 = SESSION_TTL_MS / 1000;
const RATE_TTL_SECONDS: u64 = 60 * 60 * 26;

#[derive(Deserialize)]
struct StoredCode {
    rowid: i64,
    code: String,
    expires_at: i64,
    consumed: i64,
    attempts: i64,
}

#[derive(Deserialize)]
struct DbUser {
    id: String,
    email: String,
    display_name: Option<String>,
}

pub async fn request_code(mut req: Request, env: Env) -> Result<Response> {
    let body: Value = match req.json().await {
        Ok(body) => body,
        Err(_) => return json(400, json_value!({ "error": "请求格式错误" })),
    };
    let email =
        trim_ecmascript(body.get("email").and_then(Value::as_str).unwrap_or("")).to_lowercase();
    if !is_valid_email(&email) {
        return json(400, json_value!({ "error": "邮箱格式不对" }));
    }

    let (Ok(db), Ok(mail), Some(mail_secret)) = (
        env.d1("DB"),
        env.service("MAIL"),
        env_string(&env, "MAIL_API_SECRET"),
    ) else {
        return json(503, json_value!({ "error": "登录暂未配置" }));
    };

    if let Ok(kv) = env.kv("AI_RATELIMIT") {
        let ip = req
            .headers()
            .get("cf-connecting-ip")?
            .unwrap_or_else(|| "anon".into());
        let day = utc_day();
        let email_decision = check_rate_limit(&kv, &format!("otp-email:{email}"), &day, 8).await?;
        let ip_decision = check_rate_limit(&kv, &format!("otp-ip:{ip}"), &day, 30).await?;
        if !email_decision || !ip_decision {
            return json(
                429,
                json_value!({ "error": "验证码发送太频繁，请稍后再试" }),
            );
        }
    }

    let code = code_from(random_u32()?);
    let now = now_ms();
    insert_login_code(&db, &email, &code, now + CODE_TTL_MS, now).await?;
    let content = build_otp_email(&code);
    if send_mail(
        &mail,
        &mail_secret,
        &email,
        &content.subject,
        &content.html,
        &content.text,
    )
    .await
    .is_err()
    {
        return json(502, json_value!({ "error": "验证码发送失败，请稍后再试" }));
    }
    json(200, json_value!({ "ok": true }))
}

pub async fn verify(mut req: Request, env: Env) -> Result<Response> {
    let body: Value = match req.json().await {
        Ok(body) => body,
        Err(_) => return json(400, json_value!({ "error": "请求格式错误" })),
    };
    let email =
        trim_ecmascript(body.get("email").and_then(Value::as_str).unwrap_or("")).to_lowercase();
    let code = trim_ecmascript(body.get("code").and_then(Value::as_str).unwrap_or(""));
    if !is_valid_email(&email) || code.len() != 6 || !code.bytes().all(|byte| byte.is_ascii_digit())
    {
        return json(400, json_value!({ "error": "邮箱或验证码格式不对" }));
    }

    let (Ok(db), Some(session_secret)) = (env.d1("DB"), env_string(&env, "SESSION_SECRET")) else {
        return json(503, json_value!({ "error": "登录暂未配置" }));
    };
    let now = now_ms();
    let Some(row) = latest_code(&db, &email).await? else {
        return json(400, json_value!({ "error": "请先获取验证码" }));
    };
    let verdict = evaluate_code(
        &CodeRow {
            code: row.code.clone(),
            expires_at: row.expires_at,
            consumed: row.consumed,
            attempts: row.attempts,
        },
        code,
        now,
    );
    if verdict != CodeVerdict::Ok {
        if verdict == CodeVerdict::Wrong {
            bump_code_attempts(&db, row.rowid).await?;
        }
        return json(400, json_value!({ "error": verdict_message(verdict) }));
    }

    consume_code(&db, row.rowid).await?;
    let user = upsert_user_by_email(&db, &email, now).await?;
    let token = sign_session(
        &SessionPayload {
            uid: user.id,
            email: user.email.clone(),
            exp: now + SESSION_TTL_MS,
        },
        &session_secret,
    );
    let mut response = json(
        200,
        json_value!({
            "user": { "email": user.email, "displayName": user.display_name }
        }),
    )?;
    response
        .headers_mut()
        .set("set-cookie", &session_cookie(&token, SESSION_TTL_SECONDS))?;
    Ok(response)
}

pub async fn me(req: Request, env: Env) -> Result<Response> {
    let Some(session_secret) = env_string(&env, "SESSION_SECRET") else {
        return json(200, json_value!({ "user": null }));
    };
    let user =
        read_session(&req, &session_secret).map(|session| json_value!({ "email": session.email }));
    json(200, json_value!({ "user": user }))
}

pub fn logout() -> Result<Response> {
    let mut response = json(200, json_value!({ "ok": true }))?;
    response
        .headers_mut()
        .set("set-cookie", &session_cookie("", 0))?;
    Ok(response)
}

async fn check_rate_limit(kv: &KvStore, scope: &str, day: &str, limit: u32) -> Result<bool> {
    let key = rl_key(scope, day);
    let current = kv
        .get(&key)
        .text()
        .await?
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(0);
    let decision = decide(current, limit);
    if decision.allowed {
        kv.put(&key, decision.new_count.to_string())?
            .expiration_ttl(RATE_TTL_SECONDS)
            .execute()
            .await?;
    }
    Ok(decision.allowed)
}

fn random_u32() -> Result<u32> {
    use worker::wasm_bindgen::{JsCast, JsValue};
    let crypto =
        worker::js_sys::Reflect::get(&worker::js_sys::global(), &JsValue::from_str("crypto"))?;
    let get_random_values =
        worker::js_sys::Reflect::get(&crypto, &JsValue::from_str("getRandomValues"))?
            .dyn_into::<worker::js_sys::Function>()?;
    let values = worker::js_sys::Uint32Array::new_with_length(1);
    get_random_values.call1(&crypto, &values)?;
    Ok(values.get_index(0))
}

fn random_uuid() -> Result<String> {
    use worker::wasm_bindgen::{JsCast, JsValue};
    let crypto =
        worker::js_sys::Reflect::get(&worker::js_sys::global(), &JsValue::from_str("crypto"))?;
    let random_uuid = worker::js_sys::Reflect::get(&crypto, &JsValue::from_str("randomUUID"))?
        .dyn_into::<worker::js_sys::Function>()?;
    Ok(random_uuid.call0(&crypto)?.as_string().unwrap_or_default())
}

fn session_cookie(value: &str, max_age: i64) -> String {
    format!("rdsess={value}; Path=/; Max-Age={max_age}; Secure; HttpOnly; SameSite=Lax")
}

fn read_session(req: &Request, secret: &str) -> Option<SessionPayload> {
    let cookie_header = req.headers().get("cookie").ok()??;
    let token = cookie_header
        .split(';')
        .filter_map(|part| part.trim().split_once('='))
        .find_map(|(name, value)| (name == "rdsess").then_some(value))?;
    verify_session(token, secret, now_ms())
}

fn verdict_message(verdict: CodeVerdict) -> &'static str {
    match verdict {
        CodeVerdict::Wrong => "验证码不对",
        CodeVerdict::Expired => "验证码已过期，请重新获取",
        CodeVerdict::Consumed => "验证码已用过，请重新获取",
        CodeVerdict::Exhausted => "尝试次数太多，请重新获取",
        CodeVerdict::Ok => unreachable!("successful code verdict has no error message"),
    }
}

async fn insert_login_code(
    db: &D1Database,
    email: &str,
    code: &str,
    expires_at: i64,
    now: i64,
) -> Result<()> {
    db.prepare("INSERT INTO login_codes (email, code, expires_at, consumed, attempts, created_at) VALUES (?, ?, ?, 0, 0, ?)")
        .bind(&[
            worker::wasm_bindgen::JsValue::from_str(email),
            worker::wasm_bindgen::JsValue::from_str(code),
            worker::wasm_bindgen::JsValue::from_f64(expires_at as f64),
            worker::wasm_bindgen::JsValue::from_f64(now as f64),
        ])?
        .run()
        .await?;
    Ok(())
}

async fn latest_code(db: &D1Database, email: &str) -> Result<Option<StoredCode>> {
    db.prepare("SELECT rowid, code, expires_at, consumed, attempts FROM login_codes WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT 1")
        .bind(&[worker::wasm_bindgen::JsValue::from_str(email)])?
        .first(None)
        .await
}

async fn bump_code_attempts(db: &D1Database, rowid: i64) -> Result<()> {
    db.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE rowid = ?")
        .bind(&[worker::wasm_bindgen::JsValue::from_f64(rowid as f64)])?
        .run()
        .await?;
    Ok(())
}

async fn consume_code(db: &D1Database, rowid: i64) -> Result<()> {
    db.prepare("UPDATE login_codes SET consumed = 1 WHERE rowid = ?")
        .bind(&[worker::wasm_bindgen::JsValue::from_f64(rowid as f64)])?
        .run()
        .await?;
    Ok(())
}

async fn upsert_user_by_email(db: &D1Database, email: &str, now: i64) -> Result<DbUser> {
    if let Some(user) = db
        .prepare("SELECT id, email, display_name FROM users WHERE email = ?")
        .bind(&[worker::wasm_bindgen::JsValue::from_str(email)])?
        .first(None)
        .await?
    {
        return Ok(user);
    }
    let id = random_uuid()?;
    db.prepare("INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, NULL, ?)")
        .bind(&[
            worker::wasm_bindgen::JsValue::from_str(&id),
            worker::wasm_bindgen::JsValue::from_str(email),
            worker::wasm_bindgen::JsValue::from_f64(now as f64),
        ])?
        .run()
        .await?;
    Ok(DbUser {
        id,
        email: email.into(),
        display_name: None,
    })
}

async fn send_mail(
    mail: &Fetcher,
    secret: &str,
    to: &str,
    subject: &str,
    html: &str,
    text: &str,
) -> Result<()> {
    let headers = worker::Headers::new();
    headers.set("authorization", &format!("Bearer {secret}"))?;
    headers.set("content-type", "application/json")?;
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_headers(headers)
        .with_body(Some(worker::wasm_bindgen::JsValue::from_str(
            &json_value!({
                "to": to, "subject": subject, "html": html, "text": text
            })
            .to_string(),
        )));
    let response = mail.fetch("https://lakebbs-mail/send", Some(init)).await?;
    if !(200..300).contains(&response.status_code()) {
        return Err(worker::Error::RustError("mail send failed".into()));
    }
    Ok(())
}
