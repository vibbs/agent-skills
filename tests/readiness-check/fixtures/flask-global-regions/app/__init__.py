from logging.config import dictConfig

from flask import Flask
from flask_babel import Babel
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()

dictConfig({
    "version": 1,
    "formatters": {"json": {"()": "pythonjsonlogger.jsonlogger.JsonFormatter"}},
    "handlers": {"stdout": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"level": "INFO", "handlers": ["stdout"]},
})


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    app.config.update(overrides or {})
    db.init_app(app)
    Migrate(app, db)
    csrf.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "main.login"
    Babel(app)

    from app.routes import bp

    app.register_blueprint(bp)
    return app
