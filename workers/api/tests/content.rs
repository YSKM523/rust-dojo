use rust_dojo_api::pages::content::{render_markdown, site_content};
use rust_dojo_api::pages::exercise::{
    render_detail as render_exercise_detail, render_page as render_exercise_page,
};
use rust_dojo_api::pages::home::render_page as render_home_page;
use rust_dojo_api::pages::learn::{
    render_detail as render_learn_detail, render_index as render_learn_index,
    render_page as render_learn_page,
};
use rust_dojo_api::pages::login::render_page as render_login_page;
use rust_dojo_api::pages::me::render_page as render_me_page;
use rust_dojo_api::pages::project::{
    render_detail as render_project_detail, render_page as render_project_page,
};
use rust_dojo_api::pages::resources::{render_detail, render_index, render_page};

#[test]
fn home_page_renders_every_section_and_complete_fx_mounts() {
    let page = render_home_page("/", None).expect("home page renders a response");

    assert_eq!(page.status, 200);
    assert!(page
        .html
        .contains("<title>Rust 道场 — 从零到后端实战</title>"));
    assert!(page.html.contains("<h1"));
    assert!(page.html.contains("Rust 道场"));
    assert!(page.html.contains("为什么是 Rust"));
    assert!(page.html.contains("八个模块"));
    assert!(page.html.contains("学习方式"));
    assert!(page.html.contains("求职地图 / 精选"));
    for statistic in ["8", "60", "4", "3"] {
        assert!(
            page.html
                .contains(&format!("data-fx-value=\"{statistic}\"")),
            "missing count-up statistic: {statistic}"
        );
    }
    assert_eq!(page.html.matches("class=\"fx-ladder-row").count(), 8);
    assert_eq!(page.html.matches("data-active=\"true\"").count(), 1);
    assert_eq!(page.html.matches("data-active=\"false\"").count(), 7);
    for (text_class, bar_class) in [
        ("text-emerald-700 dark:text-emerald-400", "bg-emerald-600"),
        ("text-sky-700 dark:text-sky-400", "bg-sky-600"),
        ("text-violet-700 dark:text-violet-400", "bg-violet-600"),
        ("text-amber-800 dark:text-amber-400", "bg-amber-600"),
        ("text-brand dark:text-[#ef8f4a]", "bg-brand"),
    ] {
        assert!(page
            .html
            .contains(&format!("data-fx-tier-class=\"{text_class}\"")));
        assert!(page
            .html
            .contains(&format!("data-fx-bar-class=\"{bar_class}\"")));
    }
    for mount in [
        "reveal",
        "count-up",
        "hero-terminal",
        "magnetic",
        "marquee",
        "module-ladder",
    ] {
        assert!(
            page.html.contains(&format!("data-fx=\"{mount}\"")),
            "missing fx mount: {mount}"
        );
    }
    assert!(page.html.contains("data-fx-ladder-index>01</span>"));
    assert!(page
        .html
        .contains("<p data-fx-cmd class=\"text-fg2\">$ cargo run --release --jd 2026</p>"));
    assert!(page
        .html
        .contains("<p data-fx-line>   Compiling rust-dojo v0.1.0</p>"));
    assert!(page.html.contains(
        "<p data-fx-line class=\"text-ok\">    Finished `release` in 0.8s — 开始训练</p>"
    ));
    assert!(!page.html.contains("fx-caret"));
    assert!(page
        .html
        .contains("<script type=\"module\" src=\"/assets/js/fx.js\"></script>"));
    let featured_positions = [
        "href=\"/resources/jd-ownership\"",
        "href=\"/resources/jd-async\"",
        "href=\"/resources/q-blocking\"",
        "href=\"/resources/cheat-error-tree\"",
    ]
    .map(|href| page.html.find(href).expect("featured resource renders"));
    assert!(featured_positions.windows(2).all(|pair| pair[0] < pair[1]));
}

#[test]
fn home_page_renderer_preserves_the_html_not_found_fallback() {
    let page = render_home_page("/nope", None).expect("unknown page renders a response");

    assert_eq!(page.status, 404);
    assert!(page.html.contains("页面不存在"));
    assert!(!page.html.contains("为什么是 Rust"));
}

#[test]
fn generated_site_content_deserializes_with_all_modules() {
    let content = site_content();

    assert_eq!(content.modules.len(), 8);
    assert_eq!(content.resources.len(), 3);
    assert!(!content.exercises.is_empty());
    assert!(!content.projects.is_empty());
}

#[test]
fn generated_site_content_deserializes_nested_exercise_judge_data() {
    let content = site_content();
    let stdout_exercise = content
        .exercises
        .iter()
        .find(|exercise| exercise.id == "m1-01")
        .expect("known stdout exercise exists");
    let tests_exercise = content
        .exercises
        .iter()
        .find(|exercise| exercise.id == "m1-08")
        .expect("known tests exercise exists");

    assert_eq!(stdout_exercise.judge.judge_mode, "stdout");
    assert!(stdout_exercise
        .judge
        .expected_stdout
        .as_deref()
        .expect("stdout exercise has expected output")
        .contains("Rust 道场"));
    assert_eq!(tests_exercise.judge.judge_mode, "tests");
    assert_eq!(tests_exercise.judge.crate_type.as_deref(), Some("lib"));
    assert!(tests_exercise
        .judge
        .hidden_tests
        .as_deref()
        .expect("tests exercise has hidden tests")
        .contains("takes_word_before_first_space"));
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
fn exercise_page_renders_title_prompt_data_island_editor_and_navigation() {
    let page =
        render_exercise_page("/exercise/m1-01", None).expect("exercise page renders a response");

    assert_eq!(page.status, 200);
    assert!(page.html.contains(
        "<h1 class=\"mt-2 text-4xl font-black leading-tight text-fg\">println! 与格式化占位符</h1>"
    ));
    assert!(page.html.contains("<h3>打印你的第一行 Rust</h3>"));
    assert!(page
        .html
        .contains("<script type=\"application/json\" id=\"exercise-data\">"));
    assert!(page.html.contains("data-island=\"exercise\""));
    assert!(page.html.contains(
        "<div class=\"cm-theme-dark\" aria-label=\"Rust 代码编辑器\" data-exercise-editor></div>"
    ));
    assert!(page
        .html
        .contains("<span data-exercise-run-label>运行</span>"));
    assert!(page.html.contains(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>"#
    ));
    assert!(page.html.contains("href=\"/learn/m1\""));
    assert!(page.html.contains("href=\"/exercise/m1-02\""));
    assert!(page.html.contains("第 1 / 9 题 · 回模块"));
    assert!(page.html.contains("data-exercise-ai"));
    assert!(!page.html.contains("data-exercise-dynamic"));
    assert!(!page.html.contains("solutionCode"));
    assert!(page.html.contains("href=\"/learn\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
    assert!(page
        .html
        .contains("<script type=\"module\" src=\"/assets/js/exercise.js\"></script>"));
}

#[test]
fn exercise_page_data_island_contains_no_bare_less_than_characters() {
    let page =
        render_exercise_page("/exercise/m1-01", None).expect("exercise page renders a response");
    let marker = "<script type=\"application/json\" id=\"exercise-data\">";
    let json = page
        .html
        .split_once(marker)
        .expect("exercise data script exists")
        .1
        .split_once("</script>")
        .expect("exercise data script closes")
        .0;

    assert!(!json.contains('<'));
}

#[test]
fn exercise_data_json_uses_only_the_island_protocol_fields() {
    let html = render_exercise_detail("m1-08", None)
        .expect("exercise detail lookup succeeds")
        .expect("known tests exercise exists");
    let marker = "<script type=\"application/json\" id=\"exercise-data\">";
    let json = html
        .split_once(marker)
        .expect("exercise data script exists")
        .1
        .split_once("</script>")
        .expect("exercise data script closes")
        .0;
    let data: serde_json::Value =
        serde_json::from_str(json).expect("exercise data is valid inline JSON");

    assert_eq!(data["id"], "m1-08");
    assert_eq!(data["judgeMode"], "tests");
    assert_eq!(data["crateType"], "lib");
    assert!(data["starterCode"]
        .as_str()
        .is_some_and(|code| !code.is_empty()));
    assert!(data["hiddenTests"]
        .as_str()
        .is_some_and(|tests| tests.contains("takes_word_before_first_space")));
    assert_eq!(
        data.as_object()
            .expect("exercise data is an object")
            .keys()
            .cloned()
            .collect::<std::collections::BTreeSet<_>>(),
        ["crateType", "hiddenTests", "id", "judgeMode", "starterCode"]
            .into_iter()
            .map(str::to_owned)
            .collect()
    );
    assert!(!json.contains("solutionCode"));
}

#[test]
fn missing_exercise_and_duplicated_prefix_render_html_not_found() {
    for path in ["/exercise/nope", "/exercise//exercise/m1-01"] {
        let page = render_exercise_page(path, None).expect("missing exercise renders a response");

        assert_eq!(page.status, 404);
        assert!(page.html.contains("页面不存在"));
        assert!(page.html.contains("<html lang=\"zh-CN\""));
        assert!(!page.html.contains("data-island=\"exercise\""));
    }
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
    assert!(!html.contains("/assets/js/exercise.js"));
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

#[test]
fn login_page_server_renders_the_email_step_and_shared_shell() {
    let page = render_login_page("/login", None).expect("login page renders");

    assert_eq!(page.status, 200);
    assert!(page
        .html
        .contains("<title>Rust 道场 — 从零到后端实战</title>"));
    assert!(page.html.contains("data-island=\"login\""));
    assert!(page.html.contains("ACCOUNT SYNC"));
    assert!(page.html.contains("登录 Rust 道场"));
    assert!(page.html.contains("<form class=\"space-y-4\" novalidate"));
    assert!(page.html.contains("type=\"email\""));
    assert!(page.html.contains("aria-label=\"邮箱\""));
    assert!(page.html.contains("placeholder=\"you@example.com\""));
    assert!(page.html.contains("发送验证码"));
    assert!(!page.html.contains("aria-label=\"验证码\""));
    assert!(!page.html.contains("role=\"alert\""));
    assert!(page
        .html
        .contains("<script type=\"module\" src=\"/assets/js/login.js\"></script>"));
    assert!(page.html.contains("href=\"/me\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors text-fg2 hover:text-fg\""));
}

#[test]
fn login_page_accepts_one_optional_slash_and_rejects_descendants() {
    let trailing = render_login_page("/login/", None).expect("trailing slash renders");
    let descendant = render_login_page("/login/nope", None).expect("descendant renders a response");
    let duplicated =
        render_login_page("/login/login", None).expect("duplicated prefix renders a response");

    assert_eq!(trailing.status, 200);
    assert_eq!(descendant.status, 404);
    assert_eq!(duplicated.status, 404);
    assert!(descendant.html.contains("页面不存在"));
    assert!(descendant.html.contains("<html lang=\"zh-CN\""));
}

#[test]
fn me_page_server_renders_all_module_progress_mounts() {
    let page = render_me_page("/me", None).expect("me page renders");

    assert_eq!(page.status, 200);
    assert!(page
        .html
        .contains("<title>Rust 道场 — 从零到后端实战</title>"));
    assert!(page.html.contains("data-island=\"me\""));
    assert!(page.html.contains("PROGRESS LOG"));
    assert!(page.html.contains("我的足迹"));
    assert!(page.html.contains("data-me-solved>0</span> / 60 题"));
    assert_eq!(
        page.html.matches("data-me-module data-module-id=").count(),
        8
    );
    assert!(page.html.contains("data-module-id=\"m1\""));
    assert!(page
        .html
        .contains("data-exercise-ids=\"m1-01,m1-02,m1-03,m1-04,m1-05,m1-06,m1-07,m1-08,m1-09\""));
    assert!(page.html.contains(
        "href=\"/learn/m1\" class=\"font-semibold text-fg hover:text-brand\">01 / 起步与所有权</a>"
    ));
    assert!(page.html.contains("data-me-module-count>0 / 9</span>"));
    assert!(page.html.contains("style=\"width: 0%\" data-me-module-bar"));
    assert!(page.html.contains("清空进度"));
    assert!(!page.html.contains("data-me-session-status"));
    assert!(page.html.contains("href=\"/me\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
    assert!(page
        .html
        .contains("<script type=\"module\" src=\"/assets/js/me.js\"></script>"));
}

#[test]
fn me_page_keeps_page_session_client_driven_while_topbar_uses_ssr_session() {
    let page = render_me_page("/me", Some("learner@example.com")).expect("me page renders");

    assert_eq!(page.status, 200);
    assert!(page
        .html
        .contains("<span class=\"text-fg2\">learner@example.com</span>"));
    assert!(page.html.contains("data-island=\"logout\""));
    assert!(!page.html.contains("data-me-session-status"));
}

#[test]
fn me_page_accepts_one_optional_slash_and_rejects_descendants() {
    let trailing = render_me_page("/me/", None).expect("trailing slash renders");
    let descendant = render_me_page("/me/nope", None).expect("descendant renders a response");
    let duplicated = render_me_page("/me/me", None).expect("duplicated prefix renders a response");

    assert_eq!(trailing.status, 200);
    assert!(trailing.html.contains("href=\"/me\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors text-fg2 hover:text-fg\""));
    assert!(!trailing.html.contains("href=\"/me\" class=\"flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]\""));
    assert_eq!(descendant.status, 404);
    assert_eq!(duplicated.status, 404);
    assert!(descendant.html.contains("页面不存在"));
    assert!(descendant.html.contains("<html lang=\"zh-CN\""));
}
