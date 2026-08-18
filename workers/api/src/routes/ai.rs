use crate::core::{
    ai::{build_messages, deepseek_body, AiAction, AiPayload},
    progress::exercise_context,
    ratelimit::{decide, rl_key},
};
use crate::routes::{env_string, json, trim_ecmascript, utc_day};
use serde_json::{json as json_value, Value};
use worker::{Env, Fetch, KvStore, Method, Request, RequestInit, Response, Result};

const RATE_TTL_SECONDS: u64 = 60 * 60 * 26;

pub async fn ask(mut req: Request, env: Env) -> Result<Response> {
    let body: Value = match req.json().await {
        Ok(body) => body,
        Err(_) => return json(400, json_value!({ "error": "请求格式错误" })),
    };
    let Some(action) = action_from(body.get("action").and_then(Value::as_str)) else {
        return json(400, json_value!({ "error": "未知操作" }));
    };
    let code = body
        .get("code")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_owned();
    if !matches!(action, AiAction::Hint) && trim_ecmascript(&code).is_empty() {
        return json(400, json_value!({ "error": "请先写点 Rust 代码" }));
    }
    let status = match body.get("status").and_then(Value::as_str) {
        Some("passed") => "passed",
        Some("failed") => "failed",
        _ => "idle",
    };
    let Some(api_key) = env_string(&env, "DEEPSEEK_API_KEY") else {
        return json(503, json_value!({ "error": "AI 暂未配置" }));
    };
    if let Ok(kv) = env.kv("AI_RATELIMIT") {
        let ip = req
            .headers()
            .get("cf-connecting-ip")?
            .unwrap_or_else(|| "anon".into());
        if !check_rate_limit(&kv, &ip, &utc_day(), 40).await? {
            return json(
                429,
                json_value!({ "error": "今天的 AI 次数用完了，明天再来吧" }),
            );
        }
    }
    let context = body
        .get("exerciseId")
        .and_then(Value::as_str)
        .and_then(exercise_context);
    let messages = build_messages(
        action,
        &AiPayload {
            title: context.map(|(title, _)| title.to_owned()),
            prompt: context.map(|(_, prompt)| prompt.to_owned()),
            code,
            error_msg: body
                .get("errorMsg")
                .and_then(Value::as_str)
                .map(str::to_owned),
            status: status.into(),
        },
    );
    let model = env_string(&env, "DEEPSEEK_MODEL").unwrap_or_else(|| "deepseek-v4-pro".into());
    match ask_deepseek(&messages, &api_key, &model).await {
        Ok(reply) => json(200, json_value!({ "reply": reply })),
        Err(error) => json(
            502,
            json_value!({ "error": format!("AI 调用失败：{error}") }),
        ),
    }
}

fn action_from(action: Option<&str>) -> Option<AiAction> {
    match action {
        Some("hint") => Some(AiAction::Hint),
        Some("explain") => Some(AiAction::Explain),
        Some("debug") => Some(AiAction::Debug),
        _ => None,
    }
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

async fn ask_deepseek(
    messages: &Value,
    api_key: &str,
    model: &str,
) -> std::result::Result<String, String> {
    let headers = worker::Headers::new();
    headers
        .set("Content-Type", "application/json")
        .map_err(|error| error.to_string())?;
    headers
        .set("Authorization", &format!("Bearer {api_key}"))
        .map_err(|error| error.to_string())?;
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_headers(headers)
        .with_body(Some(worker::wasm_bindgen::JsValue::from_str(
            &deepseek_body(model, messages).to_string(),
        )));
    let request = Request::new_with_init("https://api.deepseek.com/chat/completions", &init)
        .map_err(|error| error.to_string())?;
    let mut response = Fetch::Request(request)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !(200..300).contains(&response.status_code()) {
        let detail = response.text().await.unwrap_or_default();
        return Err(format!(
            "DeepSeek {}: {}",
            response.status_code(),
            detail.chars().take(200).collect::<String>()
        ));
    }
    let data: Value = response.json().await.map_err(|error| error.to_string())?;
    data.pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .map(trim_ecmascript)
        .filter(|content| !content.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| "DeepSeek 返回空内容".into())
}
