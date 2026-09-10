# MongoDB schemas and models for Courses, Modules, and Lessons
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

LevelType = Literal["Beginner", "Intermediate", "Advanced"]


class ContentBlock(BaseModel):
    type: Literal["paragraph", "heading", "callout", "chart_figure", "steps"]
    content: Optional[str] = None
    level: Optional[int] = None
    variant: Optional[str] = None
    title: Optional[str] = None
    caption: Optional[str] = None
    patternType: Optional[str] = None
    steps: Optional[List[str]] = None


class KnowledgeCheck(BaseModel):
    id: str
    question: str
    options: List[str]
    correctIndex: int
    explanation: str


class LessonModel(BaseModel):
    id: str
    courseId: str
    title: str
    order: int
    durationMinutes: int = 20
    summary: str
    contentBlocks: List[ContentBlock] = Field(default_factory=list)
    knowledgeCheck: Optional[KnowledgeCheck] = None
    keyTakeaways: List[str] = Field(default_factory=list)


class ModuleModel(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    lessons: List[LessonModel] = Field(default_factory=list)


class CourseModel(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    level: LevelType
    levelNumber: int
    levelName: str
    lessonCount: int
    durationHours: float
    durationLabel: str
    instructorName: str
    instructorRole: str
    prerequisites: Optional[str] = None
    modules: List[ModuleModel] = Field(default_factory=list)
