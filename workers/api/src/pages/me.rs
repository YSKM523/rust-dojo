use askama::Template;

use super::{
    content::{site_content, Module},
    render_not_found, RenderedPage,
};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

struct ModuleProgressView<'a> {
    module: &'a Module,
    order_padded: String,
    exercise_ids: String,
    exercise_count: usize,
}

#[derive(Template)]
#[template(path = "me.html")]
struct MeTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    exercise_count: usize,
    exercise_ids: String,
    modules: Vec<ModuleProgressView<'a>>,
}

pub fn render(user_email: Option<&str>) -> askama::Result<String> {
    render_with_active(user_email, "me")
}

fn render_with_active(user_email: Option<&str>, active: &'static str) -> askama::Result<String> {
    let content = site_content();
    let exercise_ids = content
        .exercises
        .iter()
        .map(|exercise| exercise.id.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let modules = content
        .modules
        .iter()
        .map(|module| {
            let ids = content
                .exercises
                .iter()
                .filter(|exercise| exercise.module_id == module.id)
                .map(|exercise| exercise.id.as_str())
                .collect::<Vec<_>>();
            ModuleProgressView {
                module,
                order_padded: format!("{:02}", module.order),
                exercise_ids: ids.join(","),
                exercise_count: ids.len(),
            }
        })
        .collect();

    MeTemplate {
        title: PAGE_TITLE,
        active,
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        exercise_count: content.exercises.len(),
        exercise_ids,
        modules,
    }
    .render()
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    let Some(suffix) = path.strip_prefix("/me") else {
        return render_not_found(user_email);
    };
    if !matches!(suffix, "" | "/") {
        return render_not_found(user_email);
    }
    // Topbar.tsx uses pathname === "/me", so the accepted trailing-slash
    // variant must remain visually inactive rather than using prefix semantics.
    let active = if suffix.is_empty() { "me" } else { "home" };
    render_with_active(user_email, active).map(|html| RenderedPage { status: 200, html })
}
