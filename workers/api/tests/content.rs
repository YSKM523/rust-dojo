use rust_dojo_api::pages::content::{render_markdown, site_content};
use rust_dojo_api::pages::resources::{render_detail, render_index};

#[test]
fn generated_site_content_deserializes_with_all_modules() {
    let content = site_content();

    assert_eq!(content.modules.len(), 8);
    assert_eq!(content.resources.len(), 3);
    assert!(!content.exercises.is_empty());
    assert!(!content.projects.is_empty());
}

#[test]
fn generated_site_content_pre_renders_resource_markdown() {
    let resource = site_content()
        .resources
        .iter()
        .flat_map(|group| &group.items)
        .find(|item| item.id == "jd-ownership")
        .expect("known resource exists");

    assert!(resource
        .body_html
        .as_deref()
        .expect("resource body is pre-rendered")
        .contains("<h2>JD 里长什么样</h2>"));
}

#[test]
fn markdown_renderer_supports_gfm_tables_and_headings() {
    let html = render_markdown(
        "### 工具表\n\n| 命令 | 作用 |\n| --- | --- |\n| cargo test | 测试 |\n\n~~旧写法~~",
    );

    assert!(html.contains("<h3>工具表</h3>"));
    assert!(html.contains("<table>"));
    assert!(html.contains("<del>旧写法</del>"));
}

#[test]
fn markdown_renderer_escapes_raw_html() {
    let html = render_markdown("before <script>alert('xss')</script> after");

    assert!(!html.contains("<script>"));
    assert!(html.contains("&lt;script&gt;alert('xss')&lt;/script&gt;"));
}

#[test]
fn resources_index_renders_the_page_shell_and_group_content() {
    let html = render_index(None).expect("resources index renders");

    assert!(html.contains("<title>Rust 道场 — 从零到后端实战</title>"));
    assert!(html.contains("求职资料库"));
    assert!(html.contains("JD 能力对照清单"));
    assert!(html.contains("data-island=\"theme-toggle\""));
    assert!(html.contains("href=\"/login\""));
    assert!(!html.contains("data-island=\"logout\""));
}

#[test]
fn resources_index_renders_authenticated_email_and_logout() {
    let html = render_index(Some("learner@example.com")).expect("resources index renders");

    assert!(html.contains("<span class=\"text-fg2\">learner@example.com</span>"));
    assert!(html.contains("data-island=\"logout\""));
    assert!(!html.contains("href=\"/login\""));
}

#[test]
fn resource_detail_renders_markdown_inside_the_lesson_container() {
    let html = render_detail("jd-ownership", None)
        .expect("resource detail renders")
        .expect("known resource exists");

    assert!(html.contains("返回资料库"));
    assert!(html.contains("prose max-w-none prose-pre:rounded-md prose-code:font-mono"));
    assert!(html.contains("<h2>JD 里长什么样</h2>"));
    assert!(render_detail("missing-resource", None)
        .expect("missing lookup does not fail")
        .is_none());
}
