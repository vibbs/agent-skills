from flask_wtf import FlaskForm
from wtforms import PasswordField, StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length


class SignupForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=255)])
    display_name = StringField("Name", validators=[DataRequired(), Length(max=80)])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=10, max=128)])


class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])


class RecipeForm(FlaskForm):
    title = StringField("Title", validators=[DataRequired(), Length(max=120)])
    body = TextAreaField("Recipe", validators=[DataRequired(), Length(max=20000)])
