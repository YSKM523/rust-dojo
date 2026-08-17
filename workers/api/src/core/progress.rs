use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

#[derive(Deserialize)]
pub struct Manifest {
    #[serde(rename = "progressIds")]
    pub progress_ids: Vec<String>,
    exercises: HashMap<String, Exercise>,
}

#[derive(Deserialize)]
struct Exercise {
    title: String,
    prompt: String,
}

pub fn manifest() -> &'static Manifest {
    static MANIFEST: OnceLock<Manifest> = OnceLock::new();
    MANIFEST.get_or_init(|| {
        serde_json::from_str(include_str!("../../manifest.json"))
            .expect("workers/api/manifest.json is valid")
    })
}

pub fn is_known_progress_id(id: &str) -> bool {
    progress_ids().contains(id)
}

pub fn filter_known_progress_ids(ids: &[serde_json::Value]) -> Vec<String> {
    ids.iter()
        .filter_map(serde_json::Value::as_str)
        .filter(|id| is_known_progress_id(id))
        .map(str::to_owned)
        .collect()
}

pub fn exercise_context(id: &str) -> Option<(&'static str, &'static str)> {
    let exercise = manifest().exercises.get(id)?;
    Some((&exercise.title, &exercise.prompt))
}

fn progress_ids() -> &'static HashSet<&'static str> {
    static PROGRESS_IDS: OnceLock<HashSet<&'static str>> = OnceLock::new();
    PROGRESS_IDS.get_or_init(|| manifest().progress_ids.iter().map(String::as_str).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn manifest_contains_the_expected_progress_ids() {
        assert_eq!(manifest().progress_ids.len(), 103);
        assert!(is_known_progress_id("m1-01"));
        assert!(is_known_progress_id("p1-01"));
        assert!(!is_known_progress_id("m9-99"));
        assert!(!is_known_progress_id(""));
    }

    #[test]
    fn filter_known_ids_discards_invalid_values_without_reordering() {
        let ids = vec![json!("m1-01"), json!(42), json!("m9-99"), json!("p1-01")];
        assert_eq!(filter_known_progress_ids(&ids), vec!["m1-01", "p1-01"]);
    }

    #[test]
    fn known_exercise_has_title_and_prompt() {
        let (title, prompt) = exercise_context("m1-01").unwrap();
        assert!(!title.is_empty());
        assert!(!prompt.is_empty());
    }
}
