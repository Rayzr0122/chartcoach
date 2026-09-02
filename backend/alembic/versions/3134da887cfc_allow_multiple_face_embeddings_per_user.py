"""allow multiple face embeddings per user

Revision ID: 3134da887cfc
Revises: e0c0ae2db0ee
Create Date: 2026-08-23 23:02:11.221475

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3134da887cfc'
down_revision: Union[str, Sequence[str], None] = 'e0c0ae2db0ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the new non-unique index first, then drop the old unique one.
    # MySQL needs some index backing the foreign key at all times, so the
    # old unique index cannot be dropped before a replacement exists.
    op.create_index(op.f('ix_face_embeddings_user_id'), 'face_embeddings', ['user_id'], unique=False)
    op.drop_index(op.f('user_id'), table_name='face_embeddings')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f('user_id'), 'face_embeddings', ['user_id'], unique=True)
    op.drop_index(op.f('ix_face_embeddings_user_id'), table_name='face_embeddings')
