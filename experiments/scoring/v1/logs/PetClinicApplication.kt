<think>
We are translating a simple Spring Boot application's main class.
 The Java code uses annotations for configuration and has a main method to run the SpringApplication.

 In Kotlin, we can use similar annotations. However, note that:
 - `@SpringBootApplication` is composed of other annotations and should be kept as it is (or replaced by equivalent if necessary).
 - We are using Spring Boot 2 or above? The code uses `@ImportRuntimeHints` which was introduced in Spring Boot 2.4.

 Since the original Java class has a main method that runs SpringApplication, we can do similar in Kotlin.
 But note: In Kotlin, we don't need to have a static void main method because of the way it handles top-level functions and companion objects.

 However, for compatibility with Spring Boot's run method (which expects a static main method), we keep the structure as is but write it in Kotlin.

 Steps:
 1. The class should be public and named PetClinicApplication.
 2. We can use `@SpringBootApplication` directly if available, or break it down? But since it's an annotation from Spring Boot, we assume it exists for Kotlin too (same jar).
 3. Similarly, `@ImportRuntimeHints` is used.

 In Kotlin, the main method must be static and take a variable number of String arguments.

 Let's write the equivalent Kotlin code.
</think>
@SpringBootApplication
@ImportRuntimeHints(PetClinicRuntimeHints::class)
class PetClinicApplication

fun main(args: Array<String>) {
    SpringApplication.run(PetClinicApplication::class.java, *args)
}