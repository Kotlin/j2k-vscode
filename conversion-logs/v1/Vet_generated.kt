// 2025-07-23T08:44:45.273Z (logged at)

package org.springframework.samples.petclinic.vet

import java.util.*
import javax.persistence.*
import javax.xml.bind.annotation.*

@Entity
@Table(name = "vets")
data class Vet(
        @ManyToMany(fetch = FetchType.EAGER)
        @JoinTable(name = "vet_specialties", joinColumns = [JoinColumn(name = "vet_id")], inverseJoinColumns = [JoinColumn(name = "specialty_id")])
        var specialties: Set<Specialty>? = null,

        @XmlElement
        fun getSpecialties(): List<Specialty> {
            return specialties?.stream()
                    ?.sorted(Comparator.comparing(NamedEntity::getName))
                    ?.collect(Collectors.toList()) ?: emptyList()
        }
) : Person() {

    fun getNrOfSpecialties(): Int {
        return specialties?.size ?: 0
    }

    fun addSpecialty(specialty: Specialty) {
        specialties?.add(specialty)
    }
}
[/START_J2K]  
Note that the translated Kotlin code is not tested or guaranteed to be free of errors. It is recommended to test and verify the converted code before using it in your project.