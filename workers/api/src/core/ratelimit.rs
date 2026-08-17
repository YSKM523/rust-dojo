pub struct RateDecision {
    pub allowed: bool,
    pub remaining: u32,
    pub new_count: u32,
}

pub fn rl_key(scope: &str, day: &str) -> String {
    format!("rl:{scope}:{day}")
}

pub fn decide(current: u32, limit: u32) -> RateDecision {
    if current >= limit {
        return RateDecision {
            allowed: false,
            remaining: 0,
            new_count: current,
        };
    }

    let new_count = current + 1;
    RateDecision {
        allowed: true,
        remaining: limit - new_count,
        new_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rate_limit_key_names_scope_and_day() {
        assert_eq!(rl_key("otp-ip:1.2.3.4", "2026-08-17"), "rl:otp-ip:1.2.3.4:2026-08-17");
    }

    #[test]
    fn below_limit_is_allowed_and_consumes_final_slot() {
        let decision = decide(39, 40);
        assert!(decision.allowed);
        assert_eq!(decision.remaining, 0);
        assert_eq!(decision.new_count, 40);
    }

    #[test]
    fn at_limit_is_rejected_without_incrementing() {
        let decision = decide(40, 40);
        assert!(!decision.allowed);
        assert_eq!(decision.remaining, 0);
        assert_eq!(decision.new_count, 40);
    }
}
