"""add support ticket model

Revision ID: 1234567890ab
Revises: 7d005d6a327d
Create Date: 2026-10-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = '7d005d6a327d' # هذا هو الـ revision الخاص بملفك الأساسي (تأكد منه)
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('support_tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='open'),
        sa.Column('admin_reply', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('support_tickets')
