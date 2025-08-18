package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank

@MappedSuperclass
open class NamedEntity : BaseEntity() {

    @Column(name = "name")
    @NotBlank
    private var name: String? = null

    fun getName(): String {
        return this.name ?: ""
    }

    override fun toString(): String {
        return this.getName()
    }

    fun setName(name: String) {
        this.name = name
    }
}