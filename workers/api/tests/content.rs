use rust_dojo_api::pages::content::{render_markdown, site_content};
use rust_dojo_api::pages::learn::{
    render_detail as render_learn_detail, render_index as render_learn_index,
    render_page as render_learn_page,
};
use rust_dojo_api::pages::project::{
    render_detail as render_project_detail, render_page as render_project_page,
};
use rust_dojo_api::pages::resources::{render_detail, render_index, render_page};

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
    assert!(html.contains(
        "<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"48x48\" type=\"image/x-icon\">"
    ));
    assert!(html
        .contains("<link rel=\"icon\" href=\"/icon.png\" sizes=\"512x512\" type=\"image/png\">"));
    assert!(html.contains(
        "<link rel=\"apple-touch-icon\" href=\"/apple-icon.png\" sizes=\"180x180\" type=\"image/png\">"
    ));
    assert!(html.contains("<script type=\"module\" src=\"/assets/js/progress-sync.js\"></script>"));
    assert!(html.contains("求职资料库"));
    assert!(html.contains("JD 能力对照清单"));
    assert!(html.contains("href=\"/resources\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
    assert!(html.contains("href=\"/learn\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors text-fg2 hover:text-fg\""));
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

#[test]
fn resource_page_router_strips_the_prefix_only_once() {
    let page = render_page("/resources//resources/jd-ownership", None)
        .expect("resource namespace renders a response");

    assert_eq!(page.status, 404);
    assert!(page.html.contains("页面不存在"));
    assert!(!page.html.contains("JD 里长什么样"));
}

#[test]
fn missing_resource_renders_the_html_not_found_page() {
    let page = render_page("/resources/nope", None).expect("missing resource renders a response");

    assert_eq!(page.status, 404);
    assert!(page.html.contains("页面不存在"));
    assert!(page.html.contains("href=\"/\""));
    assert!(page.html.contains("<html lang=\"zh-CN\""));
    assert!(page.html.contains("href=\"/resources\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors text-fg2 hover:text-fg\""));
}

#[test]
fn learn_index_renders_all_eight_modules_and_progress_mounts() {
    let html = render_learn_index(None).expect("learn index renders");

    assert!(html.contains("训练路径"));
    assert_eq!(html.matches("data-module-progress").count(), 8);
    assert!(html.contains("data-module-id=\"m1\""));
    assert!(html
        .contains("data-exercise-ids=\"m1-01,m1-02,m1-03,m1-04,m1-05,m1-06,m1-07,m1-08,m1-09\""));
    assert!(html.contains("href=\"/learn\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
    for class in [
        "px-2 py-0.5 text-xs font-bold bg-emerald-700 text-white",
        "px-2 py-0.5 text-xs font-bold bg-sky-700 text-white",
        "px-2 py-0.5 text-xs font-bold bg-violet-700 text-white",
        "px-2 py-0.5 text-xs font-bold bg-amber-700 text-white",
        "px-2 py-0.5 text-xs font-bold bg-brand text-white",
    ] {
        assert!(
            html.contains(&format!("class=\"{class}\"")),
            "missing tier badge class: {class}"
        );
    }
}

#[test]
fn template_dynamic_text_has_react_whitespace_parity() {
    let module_html = render_learn_detail("m1", None)
        .expect("module detail renders")
        .expect("known module exists");
    let project_html = render_project_detail("p1", None)
        .expect("project detail renders")
        .expect("known project exists");

    assert!(module_html.contains("<span class=\"mr-2 text-fg3\">1.</span>println! 与格式化占位符"));
    assert!(project_html.contains(
        "<span class=\"mr-2 font-mono text-xs text-fg3\">p1-01</span>用 cargo new 初始化 mini_grep"
    ));
}

#[test]
fn learn_module_renders_lesson_markdown_and_exercise_mounts() {
    let html = render_learn_detail("m1", None)
        .expect("module detail renders")
        .expect("known module exists");

    assert!(html.contains("MODULE 1 / 小白"));
    assert!(html.contains("<h2>起步与所有权</h2>"));
    assert!(html.contains("prose max-w-none prose-pre:rounded-md prose-code:font-mono"));
    assert!(html.contains("data-exercise-id=\"m1-01\""));
    assert!(html.contains("难度 1"));
}

#[test]
fn missing_learn_module_renders_the_html_not_found_page() {
    let page = render_learn_page("/learn/nope", None).expect("missing module renders a response");

    assert_eq!(page.status, 404);
    assert!(page.html.contains("页面不存在"));
    assert!(page.html.contains("<html lang=\"zh-CN\""));
}

#[test]
fn learn_page_router_strips_the_prefix_only_once() {
    let page =
        render_learn_page("/learn//learn/m1", None).expect("learn namespace renders a response");

    assert_eq!(page.status, 404);
    assert!(!page.html.contains("<h2>起步与所有权</h2>"));
}

#[test]
fn project_pages_render_all_four_projects_and_all_43_checklist_ids() {
    let mut checklist_ids = 0;

    for id in ["p1", "p2", "p3", "p4"] {
        let html = render_project_detail(id, None)
            .expect("project detail renders")
            .expect("known project exists");
        assert!(html.contains(&format!("实战项目 {} / 本地 cargo", id.to_uppercase())));
        checklist_ids += html.matches("data-id=\"").count();
    }

    assert_eq!(checklist_ids, 43);
}

#[test]
fn project_page_server_renders_brief_and_complete_checklist_dom() {
    let html = render_project_detail("p1", None)
        .expect("project detail renders")
        .expect("known project exists");

    assert!(html.contains("<h2>目标</h2>"));
    assert!(html.contains("写一个能用的命令行搜索工具"));
    assert!(html.contains("prose max-w-none prose-pre:rounded-md prose-code:font-mono"));
    assert!(html.contains("role=\"progressbar\""));
    assert!(html.contains("aria-valuenow=\"0\""));
    assert!(html.contains("data-id=\"p1-01\""));
    assert!(html.contains(
        "aria-label=\"复制命令：cargo new mini_grep &#38;&#38; cd mini_grep &#38;&#38; cargo run\""
    ));
    assert!(html.contains("data-checklist-hint"));
    assert!(html.contains("href=\"/learn\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors text-fg2 hover:text-fg\""));
    assert!(!html.contains("href=\"/learn\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
}

#[test]
fn missing_project_renders_the_html_not_found_page() {
    let page =
        render_project_page("/project/nope", None).expect("missing project renders a response");

    assert_eq!(page.status, 404);
    assert!(page.html.contains("页面不存在"));
    assert!(page.html.contains("<html lang=\"zh-CN\""));
}

#[test]
fn project_page_router_strips_the_prefix_only_once() {
    let page = render_project_page("/project//project/p1", None)
        .expect("project namespace renders a response");

    assert_eq!(page.status, 404);
    assert!(!page.html.contains("写一个能用的命令行搜索工具"));
}
