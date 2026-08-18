use askama::Template;

use super::{
    content::{site_content, Module, ResourceItem},
    render_not_found, RenderedPage,
};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

struct ModuleView<'a> {
    module: &'a Module,
    href: String,
    order_padded: String,
    is_beginner: bool,
    is_intermediate: bool,
    is_advanced: bool,
    is_senior: bool,
    is_sprint: bool,
}

struct FeaturedResourceView<'a> {
    resource: &'a ResourceItem,
    href: String,
    delay: usize,
}

#[derive(Template)]
#[template(path = "home.html")]
struct HomeTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
    module_count: usize,
    exercise_count: usize,
    exercise_suffix: &'static str,
    project_count: usize,
    module_total_padded: String,
    initial_progress_width: String,
    modules: Vec<ModuleView<'a>>,
    initial_module: &'a Module,
    initial_is_beginner: bool,
    initial_is_intermediate: bool,
    initial_is_advanced: bool,
    initial_is_senior: bool,
    initial_is_sprint: bool,
    featured_resources: Vec<FeaturedResourceView<'a>>,
}

pub fn render_index(user_email: Option<&str>) -> askama::Result<String> {
    let content = site_content();
    let initial_module = content
        .modules
        .first()
        .expect("site content includes at least one home module");
    let modules = content.modules.iter().map(module_view).collect();
    let featured_resources = content
        .featured_resource_ids
        .iter()
        .filter_map(|featured_id| {
            content
                .resources
                .iter()
                .flat_map(|group| &group.items)
                .find(|resource| resource.id == *featured_id)
        })
        .enumerate()
        .map(|(index, resource)| FeaturedResourceView {
            resource,
            href: format!("/resources/{}", resource.id),
            delay: index * 70,
        })
        .collect();

    HomeTemplate {
        title: PAGE_TITLE,
        // Topbar.tsx has no active predicate for the root route.
        active: "home",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
        module_count: if content.modules.is_empty() {
            8
        } else {
            content.modules.len()
        },
        exercise_count: if content.exercises.is_empty() {
            60
        } else {
            content.exercises.len()
        },
        exercise_suffix: if content.exercises.is_empty() {
            "+"
        } else {
            ""
        },
        project_count: if content.projects.is_empty() {
            4
        } else {
            content.projects.len()
        },
        module_total_padded: format!("{:02}", content.modules.len()),
        initial_progress_width: format!("{}%", 100.0 / content.modules.len() as f64),
        modules,
        initial_module,
        initial_is_beginner: initial_module.tier_key == "beginner",
        initial_is_intermediate: initial_module.tier_key == "intermediate",
        initial_is_advanced: initial_module.tier_key == "advanced",
        initial_is_senior: initial_module.tier_key == "senior",
        initial_is_sprint: initial_module.tier_key == "sprint",
        featured_resources,
    }
    .render()
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    if path == "/" {
        return render_index(user_email).map(|html| RenderedPage { status: 200, html });
    }

    render_not_found(user_email)
}

fn module_view(module: &Module) -> ModuleView<'_> {
    let is_beginner = module.tier_key == "beginner";
    let is_intermediate = module.tier_key == "intermediate";
    let is_advanced = module.tier_key == "advanced";
    let is_senior = module.tier_key == "senior";
    let is_sprint = module.tier_key == "sprint";

    debug_assert!(
        is_beginner || is_intermediate || is_advanced || is_senior || is_sprint,
        "unknown tier key: {}",
        module.tier_key
    );

    ModuleView {
        module,
        href: format!("/learn/{}", module.id),
        order_padded: format!("{:02}", module.order),
        is_beginner,
        is_intermediate,
        is_advanced,
        is_senior,
        is_sprint,
    }
}
