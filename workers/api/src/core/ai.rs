const RUST_TUTOR_PERSONA: &str = concat!(
    "你是一位耐心的 Rust 导师。始终使用简体中文，以苏格拉底式提问引导学员自己推导；不要直接给出完整答案或可直接提交的完整代码。",
    "结合学员传入的代码与编译器信息解释所有权、借用、生命周期、trait、错误处理等相关概念；合适时鼓励查阅 Rust 标准库（std）官方文档。"
);

pub enum AiAction {
    Hint,
    Explain,
    Debug,
}

pub struct AiPayload {
    pub title: Option<String>,
    pub prompt: Option<String>,
    pub code: String,
    pub error_msg: Option<String>,
    pub status: String,
}

pub fn build_messages(action: AiAction, p: &AiPayload) -> serde_json::Value {
    match action {
        AiAction::Hint => {
            let status = &p.status;
            let guidance = if p.status == "passed" {
                "学员的答案已经通过。请复盘关键思路、指出这题训练的 Rust 概念，并给出下一题前的准备建议；不要质疑结果是否正确。"
            } else {
                "请给出循序渐进的提示：指出下一步该想什么、或哪里可能不对。"
            };
            let system = format!("{RUST_TUTOR_PERSONA}{guidance}用 2-4 句给出简洁引导，优先提出一个能推动思考的问题。");
            let code = if p.code.is_empty() { "(还没写)" } else { &p.code };
            serde_json::json!([
                { "role": "system", "content": system },
                {
                    "role": "user",
                    "content": format!(
                        "题目：{}\n要求：{}\n判题状态：{status}\n我目前写的 Rust 代码：\n{code}",
                        p.title.as_deref().unwrap_or(""),
                        p.prompt.as_deref().unwrap_or("")
                    )
                }
            ])
        }
        AiAction::Explain => serde_json::json!([
            {
                "role": "system",
                "content": format!(
                    "{RUST_TUTOR_PERSONA}逐步、通俗地解释这段代码在做什么，并点明它涉及的 Rust 规则。简洁，不超过 6 句。"
                )
            },
            { "role": "user", "content": format!("解释这段 Rust 代码：\n{}", p.code) }
        ]),
        AiAction::Debug => serde_json::json!([
            {
                "role": "system",
                "content": format!(
                    "{RUST_TUTOR_PERSONA}学员的代码编译或运行失败了：先根据代码和 rustc 报错定位根因，再用问题与关键片段给出修复方向。简洁。"
                )
            },
            {
                "role": "user",
                "content": format!(
                    "Rust 代码：\n{}\n\n报错信息：\n{}",
                    p.code,
                    p.error_msg.as_deref().unwrap_or("(无)")
                )
            }
        ]),
    }
}

pub fn deepseek_body(model: &str, messages: &serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "stream": false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(status: &str) -> AiPayload {
        AiPayload {
            title: Some("借用".into()),
            prompt: Some("解释所有权".into()),
            code: "let x = String::from(\"hi\");".into(),
            error_msg: Some("error[E0382]".into()),
            status: status.into(),
        }
    }

    #[test]
    fn hint_messages_keep_the_passed_guidance_and_user_template() {
        let messages = build_messages(AiAction::Hint, &payload("passed"));
        assert_eq!(
            messages,
            serde_json::json!([
                {
                    "role": "system",
                    "content": "你是一位耐心的 Rust 导师。始终使用简体中文，以苏格拉底式提问引导学员自己推导；不要直接给出完整答案或可直接提交的完整代码。结合学员传入的代码与编译器信息解释所有权、借用、生命周期、trait、错误处理等相关概念；合适时鼓励查阅 Rust 标准库（std）官方文档。学员的答案已经通过。请复盘关键思路、指出这题训练的 Rust 概念，并给出下一题前的准备建议；不要质疑结果是否正确。用 2-4 句给出简洁引导，优先提出一个能推动思考的问题。"
                },
                {
                    "role": "user",
                    "content": "题目：借用\n要求：解释所有权\n判题状态：passed\n我目前写的 Rust 代码：\nlet x = String::from(\"hi\");"
                }
            ])
        );
    }

    #[test]
    fn hint_keeps_an_explicit_empty_status() {
        let messages = build_messages(AiAction::Hint, &payload(""));
        assert_eq!(
            messages[1]["content"],
            "题目：借用\n要求：解释所有权\n判题状态：\n我目前写的 Rust 代码：\nlet x = String::from(\"hi\");"
        );
    }

    #[test]
    fn explain_messages_keep_the_original_system_and_user_copy() {
        let messages = build_messages(AiAction::Explain, &payload("idle"));
        assert_eq!(
            messages,
            serde_json::json!([
                {
                    "role": "system",
                    "content": "你是一位耐心的 Rust 导师。始终使用简体中文，以苏格拉底式提问引导学员自己推导；不要直接给出完整答案或可直接提交的完整代码。结合学员传入的代码与编译器信息解释所有权、借用、生命周期、trait、错误处理等相关概念；合适时鼓励查阅 Rust 标准库（std）官方文档。逐步、通俗地解释这段代码在做什么，并点明它涉及的 Rust 规则。简洁，不超过 6 句。"
                },
                {
                    "role": "user",
                    "content": "解释这段 Rust 代码：\nlet x = String::from(\"hi\");"
                }
            ])
        );
    }

    #[test]
    fn debug_messages_keep_the_original_system_and_user_copy() {
        let messages = build_messages(AiAction::Debug, &payload("failed"));
        assert_eq!(
            messages,
            serde_json::json!([
                {
                    "role": "system",
                    "content": "你是一位耐心的 Rust 导师。始终使用简体中文，以苏格拉底式提问引导学员自己推导；不要直接给出完整答案或可直接提交的完整代码。结合学员传入的代码与编译器信息解释所有权、借用、生命周期、trait、错误处理等相关概念；合适时鼓励查阅 Rust 标准库（std）官方文档。学员的代码编译或运行失败了：先根据代码和 rustc 报错定位根因，再用问题与关键片段给出修复方向。简洁。"
                },
                {
                    "role": "user",
                    "content": "Rust 代码：\nlet x = String::from(\"hi\");\n\n报错信息：\nerror[E0382]"
                }
            ])
        );
    }

    #[test]
    fn deepseek_body_has_fixed_generation_options() {
        let messages = build_messages(AiAction::Hint, &payload("idle"));
        let body = deepseek_body("deepseek-chat", &messages);
        assert_eq!(body["model"], "deepseek-chat");
        assert_eq!(body["messages"], messages);
        assert_eq!(body["max_tokens"], 1024);
        assert_eq!(body["stream"], false);
    }
}
