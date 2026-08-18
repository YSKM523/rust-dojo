use askama::Template;

use super::content::{site_content, ResourceGroup, ResourceItem, ScenarioCard};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

struct ResourceLink {
    href: String,
    label: String,
}

struct ResourceItemView<'a> {
    item: &'a ResourceItem,
    featured: bool,
    is_template: bool,
    code: &'a str,
    links: Vec<ResourceLink>,
}

struct ResourceGroupView<'a> {
    group: &'a ResourceGroup,
    items: Vec<ResourceItemView<'a>>,
}

struct ScenarioView<'a> {
    card: &'a ScenarioCard,
    case_number: String,
    href: String,
}

#[derive(Template)]
#[template(path = "resources_index.html")]
struct ResourcesIndexTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    resource_count: usize,
    group_count: usize,
    groups: Vec<ResourceGroupView<'a>>,
    scenarios: Vec<ScenarioView<'a>>,
}

struct DetailAction {
    href: String,
    label: String,
    primary: bool,
}

#[derive(Template)]
#[template(path = "resource_detail.html")]
struct ResourceDetailTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    resource: &'a ResourceItem,
    reading_time: &'a str,
    actions: Vec<DetailAction>,
    body_html: &'a str,
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
    let groups = content
        .resources
        .iter()
        .map(|group| ResourceGroupView {
            group,
            items: group
                .items
                .iter()
                .enumerate()
                .map(|(index, item)| ResourceItemView {
                    item,
                    featured: index == 0,
                    is_template: item.code.is_some(),
                    code: item.code.as_deref().unwrap_or_default(),
                    links: resource_links(item),
                })
                .collect(),
        })
        .collect();
    let scenarios = content
        .scenario_cards
        .iter()
        .enumerate()
        .map(|(index, card)| ScenarioView {
            card,
            case_number: format!("{:02}", index + 1),
            href: card
                .exercise_id
                .as_ref()
                .map(|id| format!("/exercise/{id}"))
                .unwrap_or_else(|| format!("/learn/{}", card.module_id)),
        })
        .collect();

    ResourcesIndexTemplate {
        title: PAGE_TITLE,
        active: "resources",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        resource_count: content
            .resources
            .iter()
            .map(|group| group.items.len())
            .sum(),
        group_count: content.resources.len(),
        groups,
        scenarios,
    }
    .render()
}

pub fn render_detail(id: &str, user_email: Option<&str>) -> askama::Result<Option<String>> {
    let content = site_content();
    let Some(resource) = content
        .resources
        .iter()
        .flat_map(|group| &group.items)
        .find(|item| item.id == id && item.body.is_some())
    else {
        return Ok(None);
    };

    let mut actions = Vec::new();
    if let Some(exercise) = resource
        .exercise_id
        .as_deref()
        .and_then(|id| content.exercises.iter().find(|exercise| exercise.id == id))
    {
        actions.push(DetailAction {
            href: format!("/exercise/{}", exercise.id),
            label: format!("练：{}", exercise.title),
            primary: true,
        });
    }
    if let Some(module) = resource
        .module_id
        .as_deref()
        .and_then(|id| content.modules.iter().find(|module| module.id == id))
    {
        actions.push(DetailAction {
            href: format!("/learn/{}", module.id),
            label: format!("模块：{}", module.title),
            primary: false,
        });
    }
    if let Some(project) = resource
        .project_id
        .as_deref()
        .and_then(|id| content.projects.iter().find(|project| project.id == id))
    {
        actions.push(DetailAction {
            href: format!("/project/{}", project.id),
            label: format!("项目：{}", project.title),
            primary: false,
        });
    }

    ResourceDetailTemplate {
        title: PAGE_TITLE,
        active: "resources",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        resource,
        reading_time: resource.reading_time.as_deref().unwrap_or("short read"),
        actions,
        body_html: resource.body_html.as_deref().unwrap_or_default(),
    }
    .render()
    .map(Some)
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    if matches!(path, "/resources" | "/resources/") {
        return render_index(user_email).map(|html| RenderedPage { status: 200, html });
    }

    let Some(id) = path.strip_prefix("/resources/") else {
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

fn resource_links(item: &ResourceItem) -> Vec<ResourceLink> {
    let content = site_content();
    let mut links = Vec::new();
    if item.body.is_some() {
        links.push(ResourceLink {
            href: format!("/resources/{}", item.id),
            label: "阅读全文".into(),
        });
    }
    if let Some(module) = item
        .module_id
        .as_deref()
        .and_then(|id| content.modules.iter().find(|module| module.id == id))
    {
        links.push(ResourceLink {
            href: format!("/learn/{}", module.id),
            label: format!("模块：{}", module.title),
        });
    }
    if let Some(exercise) = item
        .exercise_id
        .as_deref()
        .and_then(|id| content.exercises.iter().find(|exercise| exercise.id == id))
    {
        links.push(ResourceLink {
            href: format!("/exercise/{}", exercise.id),
            label: format!("练：{}", exercise.title),
        });
    }
    if let Some(project) = item
        .project_id
        .as_deref()
        .and_then(|id| content.projects.iter().find(|project| project.id == id))
    {
        links.push(ResourceLink {
            href: format!("/project/{}", project.id),
            label: format!("项目：{}", project.title),
        });
    }
    links
}
