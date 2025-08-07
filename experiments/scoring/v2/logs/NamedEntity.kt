package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank   // Keep even if not used in this class for now

@MappedSuperclass
open class NamedEntity : BaseEntity() {

    @field:Column(name = "name")
    var name: String? = null
}