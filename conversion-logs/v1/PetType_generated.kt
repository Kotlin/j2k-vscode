// 2025-07-22T09:00:48.724Z (logged at)

package org.springframework.samples.petclinic.owner

import org.springframework.samples.petclinic.model.NamedEntity
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "types")
class PetType : NamedEntity() {

}
