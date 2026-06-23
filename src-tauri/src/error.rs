use serde::Serialize;

/// 프런트엔드로 돌려주는 에러. `code` 로 UI 가 특별히 처리하는 경우(파일 없음,
/// 크기 초과)를 일반 실패와 구분하고, `message` 는 로그·에러 화면에 보여줄 사람용 설명이다.
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl ApiError {
    pub fn not_found(path: &str) -> Self {
        Self { code: "NotFound".into(), message: format!("File not found: {path}") }
    }

    pub fn too_large(size: u64, limit: u64) -> Self {
        Self {
            code: "TooLarge".into(),
            message: format!("File is {size} bytes, which exceeds the {limit} byte limit"),
        }
    }

    pub fn io(message: impl Into<String>) -> Self {
        Self { code: "Io".into(), message: message.into() }
    }
}
