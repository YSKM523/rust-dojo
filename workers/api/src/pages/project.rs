use askama::Template;

use super::{
    content::{site_content, Project, ProjectItem},
    render_not_found, RenderedPage,
};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

struct ChecklistItemView<'a> {
    item: &'a ProjectItem,
    has_test_command: bool,
    test_command: &'a str,
    has_hint: bool,
    hint: &'a str,
}

#[derive(Template)]
#[template(path = "project_detail.html")]
struct ProjectDetailTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    project: &'a Project,
    project_id_upper: String,
    brief_html: &'a str,
    has_after_module: bool,
    after_module_id: &'a str,
    after_module_title: &'a str,
    items: Vec<ChecklistItemView<'a>>,
}

pub fn render_detail(id: &str, user_email: Option<&str>) -> askama::Result<Option<String>> {
    let content = site_content();
    let Some(project) = content.projects.iter().find(|project| project.id == id) else {
        return Ok(None);
    };
    let after_module = content
        .modules
        .iter()
        .find(|module| module.id == project.after_module_id);
    let items = project
        .items
        .iter()
        .map(|item| ChecklistItemView {
            item,
            has_test_command: item.test_command.is_some(),
            test_command: item.test_command.as_deref().unwrap_or_default(),
            has_hint: item.hint.is_some(),
            hint: item.hint.as_deref().unwrap_or_default(),
        })
        .collect();

    ProjectDetailTemplate {
        title: PAGE_TITLE,
        // Topbar.tsx does not include /project in any active-path predicate.
        active: "project",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        project,
        project_id_upper: project.id.to_uppercase(),
        brief_html: &project.brief_html,
        has_after_module: after_module.is_some(),
        after_module_id: after_module
            .map(|module| module.id.as_str())
            .unwrap_or_default(),
        after_module_title: after_module
            .map(|module| module.title.as_str())
            .unwrap_or_default(),
        items,
    }
    .render()
    .map(Some)
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    let Some(id) = path.strip_prefix("/project/") else {
        return render_not_found(user_email);
    };
    match render_detail(id, user_email)? {
        Some(html) => Ok(RenderedPage { status: 200, html }),
        None => render_not_found(user_email),
    }
}
