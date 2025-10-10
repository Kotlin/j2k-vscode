export const HIBERNATE_PROMPT =
  "For any JPA-annotated entities, do not convert these into Kotlin data-classes. Keep entity classes open so that Hibernate can create proxies. If Hibernate requires, provide a no-argument constructor as well.";
