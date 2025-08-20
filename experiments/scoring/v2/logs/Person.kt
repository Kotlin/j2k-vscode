package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank

@MappedSuperclass
open class Person {
    @field:NotBlank
    @Column(name = "first_name")
    private var firstName: String? // nullable because of setter

        fun getFirstName(): String {
            return this.firstName ?: ""
        }

        fun setFirstName(firstName: String) {
            this.firstName = firstName
        }

    @field:NotBlank
    @Column(name = "last_name")
    private var lastName: String?

        fun getLastName(): String {
            return this.lastName ?: ""
        }

        fun setLastName(lastName: String) {
            this.lastName = lastName
        }
}