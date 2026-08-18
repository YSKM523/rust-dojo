use pulldown_cmark::{html, Event, Options, Parser};
use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Debug, Deserialize)]
pub struct SiteContent {
    pub modules: Vec<Module>,
    pub exercises: Vec<Exercise>,
    pub projects: Vec<Project>,
    pub resources: Vec<ResourceGroup>,
    #[serde(rename = "featuredResourceIds")]
    pub featured_resource_ids: Vec<String>,
    #[serde(rename = "scenarioCards")]
    pub scenario_cards: Vec<ScenarioCard>,
}

#[derive(Debug, Deserialize)]
pub struct Module {
    pub id: String,
    pub order: u8,
    pub title: String,
    #[serde(rename = "tierKey")]
    pub tier_key: String,
    #[serde(rename = "tierLabel")]
    pub tier_label: String,
    pub summary: String,
    pub lesson: String,
    #[serde(skip)]
    pub lesson_html: String,
}

#[derive(Debug, Deserialize)]
pub struct Exercise {
    pub id: String,
    #[serde(rename = "moduleId")]
    pub module_id: String,
    pub title: String,
    pub difficulty: u8,
}

#[derive(Debug, Deserialize)]
pub struct Project {
    pub id: String,
    #[serde(rename = "afterModuleId")]
    pub after_module_id: String,
    pub title: String,
    pub summary: String,
    pub brief: String,
    #[serde(skip)]
    pub brief_html: String,
    pub items: Vec<ProjectItem>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectItem {
    pub id: String,
    pub text: String,
    #[serde(rename = "testCommand")]
    pub test_command: Option<String>,
    pub hint: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ResourceGroup {
    pub id: String,
    pub title: String,
    pub eyebrow: String,
    pub summary: String,
    pub items: Vec<ResourceItem>,
}

#[derive(Debug, Deserialize)]
pub struct ResourceItem {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub category: String,
    pub level: String,
    pub tags: Vec<String>,
    #[serde(rename = "moduleId")]
    pub module_id: Option<String>,
    #[serde(rename = "exerciseId")]
    pub exercise_id: Option<String>,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[serde(rename = "readingTime")]
    pub reading_time: Option<String>,
    pub body: Option<String>,
    #[serde(skip)]
    pub body_html: Option<String>,
    pub code: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ScenarioCard {
    pub title: String,
    pub question: String,
    #[serde(rename = "moduleId")]
    pub module_id: String,
    #[serde(rename = "exerciseId")]
    pub exercise_id: Option<String>,
    pub tags: Vec<String>,
}

pub fn site_content() -> &'static SiteContent {
    static CONTENT: OnceLock<SiteContent> = OnceLock::new();
    CONTENT.get_or_init(|| {
        let mut content: SiteContent =
            serde_json::from_str(include_str!("../../site-content.json"))
                .expect("workers/api/site-content.json is valid");
        for module in &mut content.modules {
            module.lesson_html = render_markdown(&module.lesson);
        }
        for project in &mut content.projects {
            project.brief_html = render_markdown(&project.brief);
        }
        for item in content
            .resources
            .iter_mut()
            .flat_map(|group| &mut group.items)
        {
            item.body_html = item.body.as_deref().map(render_markdown);
        }
        content
    })
}

pub fn render_markdown(markdown: &str) -> String {
    let options = Options::ENABLE_GFM
        | Options::ENABLE_TABLES
        | Options::ENABLE_FOOTNOTES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS;
    let parser = Parser::new_ext(markdown, options).map(|event| match event {
        Event::Html(raw) | Event::InlineHtml(raw) => Event::Text(raw),
        event => event,
    });
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}
