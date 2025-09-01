
package org.springframework.samples.petclinic.owner

import org.springframework.samples.petclinic.model.NamedEntity

import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "types")
open class PetType : NamedEntity()
