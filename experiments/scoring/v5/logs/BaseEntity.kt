
package org.springframework.samples.petclinic.model

import java.io.Serializable
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass

@MappedSuperclass
open class BaseEntity : Serializable {

    @field:Id
    @field:GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Integer? = null

    fun isNew(): Boolean = id == null
}
