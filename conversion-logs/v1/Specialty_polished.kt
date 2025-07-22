// 2025-07-22T08:59:37.060Z (logged at)

package org.springframework.samples.petclinic.vet

import org.springframework.samples.petclinic.model.NamedEntity;

import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "specialties")
class Specialty : NamedEntity() {

}
