use askama::Template;

use super::content::{site_content, Exercise, Module, Project};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

struct RoadmapCard<'a> {
    is_project: bool,
    href: String,
    id: &'a str,
    id_upper: String,
    order: u8,
    order_padded: String,
    title: &'a str,
    summary: &'a str,
    tier_label: &'a str,
    is_beginner: bool,
    is_intermediate: bool,
    is_advanced: bool,
    is_senior: bool,
    progress_ids: String,
    progress_total: usize,
}

#[derive(Template)]
#[template(path = "learn_index.html")]
struct LearnIndexTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    module_count: usize,
    exercise_count: usize,
    project_count: usize,
    roadmap: Vec<RoadmapCard<'a>>,
}

struct ExerciseView<'a> {
    exercise: &'a Exercise,
    number: usize,
}

#[derive(Template)]
#[template(path = "module_detail.html")]
struct ModuleDetailTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    module: &'a Module,
    lesson_html: &'a str,
    exercises: Vec<ExerciseView<'a>>,
}

#[derive(Template)]
#[template(path = "not_found.html")]
struct NotFoundTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
}

pub struct RenderedPage {
    pub status: u16,
    pub html: String,
}

pub fn render_index(user_email: Option<&str>) -> askama::Result<String> {
    let content = site_content();
    let mut roadmap = Vec::with_capacity(content.modules.len() + content.projects.len());

    for module in &content.modules {
        roadmap.push(module_card(module));
        roadmap.extend(
            content
                .projects
                .iter()
                .filter(|project| project.after_module_id == module.id)
                .map(project_card),
        );
    }
    roadmap.extend(
        content
            .projects
            .iter()
            .filter(|project| {
                !content
                    .modules
                    .iter()
                    .any(|module| module.id == project.after_module_id)
            })
            .map(project_card),
    );

    LearnIndexTemplate {
        title: PAGE_TITLE,
        active: "learn",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        module_count: content.modules.len(),
        exercise_count: content.exercises.len(),
        project_count: content.projects.len(),
        roadmap,
    }
    .render()
}

pub fn render_detail(id: &str, user_email: Option<&str>) -> askama::Result<Option<String>> {
    let content = site_content();
    let Some(module) = content.modules.iter().find(|module| module.id == id) else {
        return Ok(None);
    };
    let exercises = content
        .exercises
        .iter()
        .filter(|exercise| exercise.module_id == module.id)
        .enumerate()
        .map(|(index, exercise)| ExerciseView {
            exercise,
            number: index + 1,
        })
        .collect();

    ModuleDetailTemplate {
        title: PAGE_TITLE,
        active: "learn",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        module,
        lesson_html: &module.lesson_html,
        exercises,
    }
    .render()
    .map(Some)
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    if matches!(path, "/learn" | "/learn/") {
        return render_index(user_email).map(|html| RenderedPage { status: 200, html });
    }

    let Some(id) = path.strip_prefix("/learn/") else {
        return render_not_found(user_email);
    };
    match render_detail(id, user_email)? {
        Some(html) => Ok(RenderedPage { status: 200, html }),
        None => render_not_found(user_email),
    }
}

fn render_not_found(user_email: Option<&str>) -> askama::Result<RenderedPage> {
    NotFoundTemplate {
        title: "页面不存在 — Rust 道场",
        active: "home",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
    }
    .render()
    .map(|html| RenderedPage { status: 404, html })
}

fn module_card(module: &Module) -> RoadmapCard<'_> {
    let exercise_ids = site_content()
        .exercises
        .iter()
        .filter(|exercise| exercise.module_id == module.id)
        .map(|exercise| exercise.id.as_str())
        .collect::<Vec<_>>();

    RoadmapCard {
        is_project: false,
        href: format!("/learn/{}", module.id),
        id: &module.id,
        id_upper: String::new(),
        order: module.order,
        order_padded: format!("{:02}", module.order),
        title: &module.title,
        summary: &module.summary,
        tier_label: &module.tier_label,
        is_beginner: module.tier_key == "beginner",
        is_intermediate: module.tier_key == "intermediate",
        is_advanced: module.tier_key == "advanced",
        is_senior: module.tier_key == "senior",
        progress_ids: exercise_ids.join(","),
        progress_total: exercise_ids.len(),
    }
}

fn project_card(project: &Project) -> RoadmapCard<'_> {
    RoadmapCard {
        is_project: true,
        href: format!("/project/{}", project.id),
        id: &project.id,
        id_upper: project.id.to_uppercase(),
        order: 0,
        order_padded: String::new(),
        title: &project.title,
        summary: &project.summary,
        tier_label: "",
        is_beginner: false,
        is_intermediate: false,
        is_advanced: false,
        is_senior: false,
        progress_ids: project
            .items
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>()
            .join(","),
        progress_total: project.items.len(),
    }
}
