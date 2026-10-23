import logging

from flask import Blueprint, redirect, render_template, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.forms import LoginForm, RecipeForm, SignupForm
from app.models import Recipe, User

bp = Blueprint("main", __name__)
log = logging.getLogger(__name__)


@bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        return {"ok": False}, 503
    return {"ok": True}


@bp.route("/signup", methods=["GET", "POST"])
def signup():
    form = SignupForm()
    if form.validate_on_submit():
        user = User(
            email=form.email.data.lower(),
            display_name=form.display_name.data,
            password_hash=generate_password_hash(form.password.data),
        )
        db.session.add(user)
        db.session.commit()
        log.info("new signup", extra={"email": user.email, "user_id": user.id})
        login_user(user)
        return redirect(url_for("main.index"))
    return render_template("signup.html", form=form)


@bp.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = db.session.scalar(db.select(User).filter_by(email=form.email.data.lower()))
        if user and check_password_hash(user.password_hash, form.password.data):
            login_user(user)
            return redirect(url_for("main.index"))
        log.info("failed login", extra={"email": form.email.data})
    return render_template("login.html", form=form)


@bp.post("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("main.login"))


@bp.get("/")
@login_required
def index():
    recipes = db.session.scalars(
        db.select(Recipe).filter_by(user_id=current_user.id).order_by(Recipe.created_at.desc())
    ).all()
    return render_template("index.html", recipes=recipes)


@bp.route("/recipes/new", methods=["GET", "POST"])
@login_required
def new_recipe():
    form = RecipeForm()
    if form.validate_on_submit():
        db.session.add(Recipe(user_id=current_user.id, title=form.title.data, body=form.body.data))
        db.session.commit()
        return redirect(url_for("main.index"))
    return render_template("new_recipe.html", form=form)
