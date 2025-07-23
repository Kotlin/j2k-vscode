// 2025-07-23T08:49:00.629Z (logged at)

package org.springframework.samples.petclinic.vet

import java.util.HashSet
import java.util.Comparator

import org.springframework.samples.petclinic.model.NamedEntity;
import org.springframework.samples.petclinic.model.Person;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.xml.bind.annotation.XmlElement;

@Entity
@Table(name = "vets")
open class Vet : Person() {

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "vet_specialties",
        joinColumns = [JoinColumn(name = "vet_id")],
        inverseJoinColumns = [JoinColumn(name = "specialty_id")]
    )
    private val specialtiesInternal: MutableSet<Specialty> = HashSet()

    @get:XmlElement
    val specialties: List<Specialty>
        get() = specialtiesInternal.sortedBy { it.name }

    val nrOfSpecialties: Int
        get() = specialtiesInternal.size

    fun addSpecialty(specialty: Specialty) = specialtiesInternal.add(specialty)
}
