from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TrainingProposalStatus


class TrainingProposalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)
    justification: str = Field(min_length=1, max_length=4000)

    suggested_category_id: int | None = None
    provider: str | None = Field(default=None, max_length=200)
    external_url: str | None = Field(default=None, max_length=500)
    estimated_cost_per_person: float | None = Field(default=None, ge=0)
    estimated_hours_per_person: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=4000)

    form_id: int | None = None


class TrainingProposalApproveRequest(BaseModel):
    category_id: int
    name_pl: str = Field(min_length=1, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)
    default_cost_per_person: float = Field(default=0, ge=0)
    default_hours_per_person: float = Field(default=0, ge=0)
    review_comment: str | None = Field(default=None, max_length=4000)


class TrainingProposalLinkRequest(BaseModel):
    training_name_id: int
    review_comment: str | None = Field(default=None, max_length=4000)


class TrainingProposalRejectRequest(BaseModel):
    review_comment: str = Field(min_length=1, max_length=4000)


class TrainingProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_en: str | None = None
    justification: str
    suggested_category_id: int | None = None
    provider: str | None = None
    external_url: str | None = None
    estimated_cost_per_person: float | None = None
    estimated_hours_per_person: float | None = None
    notes: str | None = None

    status: TrainingProposalStatus | str

    requester_user_id: int
    requester_role: str
    requester_full_name: str | None = None

    form_id: int | None = None

    review_comment: str | None = None
    reviewed_by_user_id: int | None = None
    reviewed_by_full_name: str | None = None
    reviewed_at: datetime | None = None

    linked_training_name_id: int | None = None
    linked_training_name_pl: str | None = None
    linked_training_name_en: str | None = None
    approved_training_name_id: int | None = None
    approved_training_name_pl: str | None = None
    approved_training_name_en: str | None = None

    created_at: datetime


class NotificationCounts(BaseModel):
    editor_inbox: int = 0
    manager_inbox: int = 0
    hr_inbox: int = 0
    hr_training_proposals: int = 0
    proposal_reviews: int = 0
    mandatory_training_alerts: int = 0


class NotificationItem(BaseModel):
    kind: str
    title: str
    body: str | None = None
    url: str
    created_at: datetime
    form_id: int | None = None


class NotificationSummaryResponse(BaseModel):
    counts: NotificationCounts
    unread_counts: NotificationCounts
    items: list[NotificationItem]


class MarkNotificationScopesRequest(BaseModel):
    scopes: list[str] = Field(default_factory=list)
    form_ids: list[int] = Field(default_factory=list)


class MarkNotificationsSeenResponse(BaseModel):
    updated: int
