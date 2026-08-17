pub const MAX_CODE_ATTEMPTS: u32 = 5;

#[derive(Debug, PartialEq, Eq)]
pub enum CodeVerdict {
    Ok,
    Wrong,
    Expired,
    Consumed,
    Exhausted,
}

pub struct CodeRow {
    pub code: String,
    pub expires_at: i64,
    pub consumed: i64,
    pub attempts: i64,
}

pub fn code_from(n: u32) -> String {
    format!("{:06}", n % 1_000_000)
}

pub fn is_valid_email(email: &str) -> bool {
    let mut parts = email.split('@');
    let Some(local) = parts.next() else {
        return false;
    };
    let Some(domain) = parts.next() else {
        return false;
    };
    if parts.next().is_some() || local.is_empty() || domain.is_empty() || !without_space_or_at(local) || !without_space_or_at(domain) {
        return false;
    }

    matches!(domain.rfind('.'), Some(dot) if dot > 0 && dot + 1 < domain.len())
}

pub fn evaluate_code(row: &CodeRow, input: &str, now_ms: i64) -> CodeVerdict {
    if row.consumed != 0 {
        CodeVerdict::Consumed
    } else if row.attempts >= i64::from(MAX_CODE_ATTEMPTS) {
        CodeVerdict::Exhausted
    } else if now_ms >= row.expires_at {
        CodeVerdict::Expired
    } else if input == row.code {
        CodeVerdict::Ok
    } else {
        CodeVerdict::Wrong
    }
}

fn without_space_or_at(value: &str) -> bool {
    value
        .chars()
        .all(|character| character != '@' && !is_ecmascript_whitespace(character))
}

fn is_ecmascript_whitespace(character: char) -> bool {
    matches!(
        character,
        '\u{0009}'..='\u{000d}'
            | '\u{0020}'
            | '\u{00a0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200a}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202f}'
            | '\u{205f}'
            | '\u{3000}'
            | '\u{feff}'
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_from_zero_pads_and_wraps_at_one_million() {
        assert_eq!(code_from(7), "000007");
        assert_eq!(code_from(1_234_567), "234567");
    }

    #[test]
    fn email_validation_matches_the_typescript_regular_expression() {
        assert!(is_valid_email("a@b.c"));
        assert!(!is_valid_email("a b@c.d"));
        assert!(is_valid_email("a\u{0085}@b.c"));
        assert!(!is_valid_email("a@b"));
        assert!(!is_valid_email("a@@b.c"));
    }

    #[test]
    fn code_evaluation_preserves_typescript_precedence() {
        let row = CodeRow {
            code: "123456".into(),
            expires_at: 100,
            consumed: 1,
            attempts: MAX_CODE_ATTEMPTS as i64,
        };
        assert_eq!(evaluate_code(&row, "123456", 100), CodeVerdict::Consumed);

        let exhausted = CodeRow { consumed: 0, ..row };
        assert_eq!(evaluate_code(&exhausted, "123456", 100), CodeVerdict::Exhausted);

        let expired = CodeRow { attempts: 0, ..exhausted };
        assert_eq!(evaluate_code(&expired, "123456", 100), CodeVerdict::Expired);

        let active = CodeRow { expires_at: 101, ..expired };
        assert_eq!(evaluate_code(&active, "wrong", 100), CodeVerdict::Wrong);
        assert_eq!(evaluate_code(&active, "123456", 100), CodeVerdict::Ok);
    }
}
