package org.springframework.samples.petclinic.vet

import java.util.Comparator
import java.util.HashSet
import java.util.Set
import java.util.stream.Collectors

import org.springframework.samples.petclinic.model.NamedEntity
import org.springframework.samples.petclinic.model.Person

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table
import jakarta.xml.bind.annotation.XmlElement

/**
 * Simple JavaBean domain object representing a veterinarian.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Arjen Poutsma
 */
@Entity
@Table(name = "vets")
open class Vet : Person {

    // The field is preserved with JPA annotations targeting the backing field in Kotlin
    @field:ManyToMany(fetch = FetchType.EAGER)
    @field:JoinTable(
        name = "vet_specialties",
        joinColumns = [JoinColumn(name="vet_id")],
        inverseJoinColumns = [JoinColumn(name="specialty_id")]
    )
    private var specialties: Set<Specialty>? = null

    // Returns the number of specialties this vet has.
    fun getNrOfSpecialties(): Int {
        return this.getSpecialtiesInternal().size
    }

    /**
     * Returns the sorted list of specialties for this vet.
     *
     * @return List<Specialty> sorted by name
     */
    @XmlElement
    fun getSpecialties(): List<Specialty> {
        val internalSet = getSpecialtiesInternal()
        return internalSet.sortedBy { it.name }.toList()
    }

    protected fun getSpecialtiesInternal(): Set<Specialty> {
        return if (this.specialties == null) {
            this.specialties = HashSet()
            this.specialties
        } else {
            this.specialties
        }
    }

    // Other methods remain unchanged...
}