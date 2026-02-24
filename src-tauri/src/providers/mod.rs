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
