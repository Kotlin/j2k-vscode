package org.springframework.samples.petclinic

import org.springframework.aot.hint.RuntimeHints
import org.springframework.aot.hint.RuntimeHintsRegistrar
import org.springframework.samples.petclinic.model.BaseEntity
import org.springframework.samples.petclinic.model.Person
import org.springframework.samples.petclinic.vet.Vet

class PetClinicRuntimeHints : RuntimeHintsRegistrar {
    override fun registerHints(hints: RuntimeHints, classLoader: ClassLoader) {
        hints.resources().registerPattern("db/*")
        hints.resources().registerPattern("messages/*")
        hints.resources().registerPattern("mysql-default-conf")

        // Register serialization types using the fully qualified class names
        val baseEntityClass = "org.springframework.samples.petclinic.model.BaseEntity"
        val personClass = "org.springframework.samples.petclinic.model.Person"
        val vetClass = "org.springframework.samples.petclinic.vet.Vet"

        hints.serialization().registerType(baseEntityClass)
        hints.serialization().registerType(personClass)
        hints.serialization().registerType(vetClass)
    }
}