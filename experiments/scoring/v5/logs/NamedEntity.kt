
package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank

@MappedSuperclass
open class NamedEntity : BaseEntity() {

    @field:Column(name = "name")
    @field:NotBlank
    var name: String? = null

    override fun toString(): String {
        return name.orEmpty()
    }
}
