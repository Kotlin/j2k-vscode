
package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank

@MappedSuperclass
open class Person : BaseEntity() {

    @field:Column(name = "first_name")
    @field:NotBlank
    var firstName: String? = null

    @field:Column(name = "last_name")
    @field:NotBlank
    var lastName: String? = null
}
