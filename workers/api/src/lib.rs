pub mod core;

#[cfg(target_arch = "wasm32")]
mod routes;

#[cfg(target_arch = "wasm32")]
#[worker::event(fetch)]
pub async fn main(
    req: worker::Request,
    env: worker::Env,
    ctx: worker::Context,
) -> worker::Result<worker::Response> {
    routes::handle(req, env, ctx).await
}
