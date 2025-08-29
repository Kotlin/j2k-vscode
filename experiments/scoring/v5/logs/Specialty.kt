
package org.springframework.samples.petclinic.vet

import org.springframework.samples.petclinic.model.NamedEntity

import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "specialties")
open class Specialty : NamedEntity()
