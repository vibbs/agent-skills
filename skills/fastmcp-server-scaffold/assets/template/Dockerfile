# Two stages. The comments explain choices that look arbitrary but were paid for.
#
# 1. `uv sync --locked`, never `pip install dist/*.whl`: installing a wheel re-resolves
#    transitive dependencies against version ranges on every build, so the image silently
#    drifts ahead of the lockfile. --locked fails the build instead.
# 2. The base image stays on a floating patch tag so OS and interpreter fixes keep
#    flowing. The application stack is pinned by uv.lock.
# 3. No BuildKit --mount caches, so the same file builds under a cloud registry's remote
#    builder and plain `docker build`.
# 4. --no-editable, so the runtime stage needs only the virtualenv, never src/.

FROM python:3.12-slim AS build
RUN pip install --no-cache-dir uv==0.11.32
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
# Dependency layer first: it caches independently of source changes.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project
COPY src ./src
RUN uv sync --locked --no-dev --no-editable

FROM python:3.12-slim
# scaffold:if with=registry
LABEL io.modelcontextprotocol.server.name="io.github.OWNER/scaffold-server"
# scaffold:end
RUN useradd --create-home --uid 10001 app
COPY --from=build --chown=app:app /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    SCAFFOLD_TRANSPORT=http \
    SCAFFOLD_HTTP_HOST=0.0.0.0 \
    PORT=8080
USER app
EXPOSE 8080
# scaffold:if with=healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8080\")}/health', timeout=2)"
# scaffold:end
CMD ["scaffold-server"]
