pub mod anthropic;

#[derive(Debug, Clone)]
pub enum ProviderErrorKind {
    Auth,
    RateLimit,
    Timeout,
    Network,
    BadRequest,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct ProviderError {
    pub kind: ProviderErrorKind,
    pub message: String,
    pub source: &'static str,
}

impl ProviderError {
    pub fn new(kind: ProviderErrorKind, message: String, source: &'static str) -> Self {
        Self { kind, message, source }
    }
}

impl ProviderError {
    pub fn category(&self) -> &'static str {
        match self.kind {
            ProviderErrorKind::Auth => "auth",
            ProviderErrorKind::RateLimit => "rate_limit",
            ProviderErrorKind::Timeout => "timeout",
            ProviderErrorKind::Network => "network",
            ProviderErrorKind::BadRequest => "bad_request",
            ProviderErrorKind::Unknown => "unknown",
        }
    }
}
