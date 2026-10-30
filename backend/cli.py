"""أدوات إدارة SANAD PLUS⁺ — CLI."""
import click
import getpass
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import AdminUser

@click.group()
def cli():
    pass

@cli.command('create-admin')
@click.option('--username', prompt=True)
@click.option('--role', default='super_admin',
              type=click.Choice(['super_admin', 'admin', 'viewer']))
def create_admin(username, role):
    """إنشاء حساب أدمن بأمان (كلمة المرور لا تُطبع في السجلات)."""
    app = create_app()
    with app.app_context():
        if db.session.query(AdminUser).filter_by(username=username).first():
            click.echo(f"ERROR: user {username} exists")
            return
        password = getpass.getpass("Password (min 12 chars): ")
        if len(password) < 12:
            click.echo("ERROR: password too short")
            return
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            click.echo("ERROR: passwords do not match")
            return
        admin = AdminUser(
            username=username,
            password_hash=generate_password_hash(password, method='scrypt'),
            role=role,
            is_active=True
        )
        db.session.add(admin)
        db.session.commit()
        click.echo(f"OK: admin '{username}' created with role '{role}'")

if __name__ == '__main__':
    cli()
