use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use sha2::Sha256;

#[derive(serde::Serialize)]
pub struct SessionPayload {
    pub uid: String,
    pub email: String,
    pub exp: i64,
}

pub fn sign_session(payload: &SessionPayload, secret: &str) -> String {
    let json = serde_json::to_string(payload).expect("session payload serializes");
    let payload_b64 = URL_SAFE_NO_PAD.encode(json);
    let signature = signature_for(&payload_b64, secret);
    format!("{payload_b64}.{}", URL_SAFE_NO_PAD.encode(signature))
}

pub fn verify_session(token: &str, secret: &str, now_ms: i64) -> Option<SessionPayload> {
    let dot = token.rfind('.')?;
    if dot == 0 {
        return None;
    }

    let (payload_b64, encoded_signature) = token.split_at(dot);
    let received_signature = URL_SAFE_NO_PAD.decode(&encoded_signature[1..]).ok()?;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(payload_b64.as_bytes());
    mac.verify_slice(&received_signature).ok()?;

    let payload_bytes = URL_SAFE_NO_PAD.decode(payload_b64).ok()?;
    let raw: serde_json::Value = serde_json::from_slice(&payload_bytes).ok()?;
    let uid = raw.get("uid")?.as_str()?.to_owned();
    let email = raw.get("email")?.as_str()?.to_owned();
    let exp = raw.get("exp")?.as_i64()?;
    if exp <= now_ms {
        return None;
    }

    Some(SessionPayload { uid, email, exp })
}

fn signature_for(payload_b64: &str, secret: &str) -> Vec<u8> {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts all key lengths");
    mac.update(payload_b64.as_bytes());
    mac.finalize().into_bytes().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    #[derive(serde::Deserialize)]
    struct Vector {
        name: String,
        token: String,
        secret: String,
        now: i64,
        expect: Option<Expected>,
    }

    #[derive(serde::Deserialize)]
    struct Expected {
        uid: String,
        email: String,
        exp: i64,
    }

    #[test]
    fn ts_vectors_all_agree() {
        let raw = include_str!("../../tests/fixtures/session-vectors.json");
        let vectors: Vec<Vector> = serde_json::from_str(raw).unwrap();
        assert!(vectors.len() >= 9);
        for v in vectors {
            let got = verify_session(&v.token, &v.secret, v.now);
            match (&got, &v.expect) {
                (Some(g), Some(e)) => {
                    assert_eq!(g.uid, e.uid, "{}", v.name);
                    assert_eq!(g.email, e.email, "{}", v.name);
                    assert_eq!(g.exp, e.exp, "{}", v.name);
                }
                (None, None) => {}
                _ => panic!("{}: got {:?}, expect {:?}", v.name, got.is_some(), v.expect.is_some()),
            }
        }
    }

    #[test]
    fn roundtrip_and_ts_compatible_shape() {
        let p = SessionPayload {
            uid: "u-9".into(),
            email: "x@y.z".into(),
            exp: 2_000_000_000_000,
        };
        let t = sign_session(&p, "s3cret");
        assert_eq!(t.matches('.').count(), 1);
        assert!(!t.contains('='));
        let (payload_b64, _) = t.split_once('.').unwrap();
        let payload_json = String::from_utf8(URL_SAFE_NO_PAD.decode(payload_b64).unwrap()).unwrap();
        assert_eq!(
            payload_json,
            r#"{"uid":"u-9","email":"x@y.z","exp":2000000000000}"#
        );
        let back = verify_session(&t, "s3cret", 1_000_000_000_000).unwrap();
        assert_eq!(back.uid, "u-9");
        assert!(verify_session(&t, "wrong", 1_000_000_000_000).is_none());
    }

    #[test]
    fn signed_non_json_payload_returns_none_without_panicking() {
        let payload = URL_SAFE_NO_PAD.encode(b"this is not json");
        let mut mac = Hmac::<Sha256>::new_from_slice(b"s3cret").unwrap();
        mac.update(payload.as_bytes());
        let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        let token = format!("{payload}.{signature}");

        assert!(verify_session(&token, "s3cret", 0).is_none());
    }

    #[test]
    fn signed_json_payload_passes_signature_verification() {
        let payload = URL_SAFE_NO_PAD
            .encode(br#"{"uid":"u-1","email":"a@b.c","exp":2000000000000}"#);
        let mut mac = Hmac::<Sha256>::new_from_slice(b"s3cret").unwrap();
        mac.update(payload.as_bytes());
        let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        let token = format!("{payload}.{signature}");

        let verified = verify_session(&token, "s3cret", 1_000_000_000_000).unwrap();
        assert_eq!(verified.uid, "u-1");
        assert_eq!(verified.email, "a@b.c");
        assert_eq!(verified.exp, 2_000_000_000_000);
    }
}
