package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank

@MappedSuperclass
open class NamedEntity : BaseEntity() {

    @Column(name = "name")
    @NotBlank
    open var name: String? = null

    override fun toString(): String {
        return this.name.toString()
    }

}