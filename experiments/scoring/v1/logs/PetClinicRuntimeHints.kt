open class PetClinicRuntimeHints : RuntimeHintsRegistrar {
    override fun registerHints(hints: RuntimeHints, classLoader: ClassLoader) {
        hints.resources().registerPattern("db/*")
        hints.resources().registerPattern("messages/*")
        hints.resources().registerPattern("mysql-default-conf")

        val baseEntityClass = BaseEntity::class.java
        val personClass = Person::class.java
        val vetClass = Vet::class.java

        hints.serialization().registerType(baseEntityClass)
        hints.serialization().registerType(personClass)
        hints.serialization().registerType(vetClass)
    }
}