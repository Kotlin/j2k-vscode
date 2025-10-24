export const LOMBOK_PROMPT =
`Do not convert Lombok: remove Lombok annotations entirely. Convert these annotations idiomatically into their exact Kotlin counterparts.

Additionally, when the @Slf4j annotation is used, create a companion object for the class as below to replicate the logger:

<kotlin>
companion object {
    private val log = Logger.getLogger(MyClass::class.java.name)
}
</kotlin>`;
