use askama::Template;
use serde::Serialize;

use super::{
    content::{site_content, Exercise},
    render_not_found, RenderedPage,
};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExerciseData<'a> {
    id: &'a str,
    judge_mode: &'a str,
    starter_code: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_stdout: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    hidden_tests: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    assert_source: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    crate_type: Option<&'a str>,
}

struct ExerciseNav<'a> {
    module_id: &'a str,
    index: usize,
    total: usize,
    has_prev: bool,
    prev_id: &'a str,
    has_next: bool,
    next_id: &'a str,
}

#[derive(Template)]
#[template(path = "exercise_detail.html")]
struct ExerciseDetailTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    exercise: &'a Exercise,
    module_id_upper: String,
    prompt_html: &'a str,
    exercise_data_json: String,
    nav: ExerciseNav<'a>,
}

pub fn render_detail(id: &str, user_email: Option<&str>) -> askama::Result<Option<String>> {
    let content = site_content();
    let Some(exercise) = content.exercises.iter().find(|exercise| exercise.id == id) else {
        return Ok(None);
    };
    let module_exercises = content
        .exercises
        .iter()
        .filter(|candidate| candidate.module_id == exercise.module_id)
        .collect::<Vec<_>>();
    let index = module_exercises
        .iter()
        .position(|candidate| candidate.id == exercise.id)
        .expect("known exercise is present in its module sequence");
    let data = ExerciseData {
        id: &exercise.id,
        judge_mode: &exercise.judge.judge_mode,
        starter_code: &exercise.starter_code,
        expected_stdout: exercise.judge.expected_stdout.as_deref(),
        hidden_tests: exercise.judge.hidden_tests.as_deref(),
        assert_source: exercise.judge.assert_source.as_deref(),
        crate_type: exercise.judge.crate_type.as_deref(),
    };
    let exercise_data_json = escape_inline_json_for_script(
        &serde_json::to_string(&data).expect("exercise island data serializes"),
    );

    ExerciseDetailTemplate {
        title: PAGE_TITLE,
        // Topbar.tsx marks /exercise as the learning-roadmap section.
        active: "learn",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        exercise,
        module_id_upper: exercise.module_id.to_uppercase(),
        prompt_html: &exercise.prompt_html,
        exercise_data_json,
        nav: ExerciseNav {
            module_id: &exercise.module_id,
            index,
            total: module_exercises.len(),
            has_prev: index > 0,
            prev_id: index
                .checked_sub(1)
                .and_then(|previous| module_exercises.get(previous))
                .map(|exercise| exercise.id.as_str())
                .unwrap_or_default(),
            has_next: index + 1 < module_exercises.len(),
            next_id: module_exercises
                .get(index + 1)
                .map(|exercise| exercise.id.as_str())
                .unwrap_or_default(),
        },
    }
    .render()
    .map(Some)
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    let Some(id) = path.strip_prefix("/exercise/") else {
        return render_not_found(user_email);
    };
    match render_detail(id, user_email)? {
        Some(html) => Ok(RenderedPage { status: 200, html }),
        None => render_not_found(user_email),
    }
}

fn escape_inline_json_for_script(json: &str) -> String {
    json.replace('<', "\\u003c")
}

#[cfg(test)]
mod tests {
    use super::escape_inline_json_for_script;

    #[test]
    fn inline_json_cannot_close_its_script_element() {
        assert_eq!(
            escape_inline_json_for_script(r#"{"code":"</script><p>"}"#),
            r#"{"code":"\u003c/script>\u003cp>"}"#
        );
    }

    #[test]
    fn inline_json_contains_no_bare_less_than_characters() {
        let escaped = escape_inline_json_for_script(r#"{"code":"<!-- <script"}"#);

        assert!(!escaped.contains('<'));
    }
}
