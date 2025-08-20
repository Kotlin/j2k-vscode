package org.springframework.samples.petclinic

import org.springframework.aot.hint.RuntimeHints
import org.springframework.aot.hint.RuntimeHintsRegistrar
import org.springframework.samples.petclinic.model.BaseEntity
import org.springframework.samples.petclinic.model.Person
import org.springframework.samples.petclinic.vet.Vet

open class PetClinicRuntimeHints : RuntimeHintsRegistrar {

    override fun registerHints(hints: RuntimeHints, classLoader: ClassLoader) {
        hints.resources().registerPattern("db/*") // https://github.com/spring-projects/spring-boot/issues/32654
        hints.resources().registerPattern("messages/*")
        hints.resources().registerPattern("mysql-default-conf")
        hints.serialization().registerType(BaseEntity::class.java)
        hints.serialization().registerType(Person::class.java)
        hints.serialization().registerType(Vet::class.java)
    }
}