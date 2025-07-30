// 2025-07-22T08:59:23.804Z (logged at)

package org.springframework.samples.petclinic.vet

import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "specialties")
class Specialty : NamedEntity() {

}
