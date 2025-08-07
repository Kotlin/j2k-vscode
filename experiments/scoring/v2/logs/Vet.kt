package org.springframework.samples.petclinic.vet

import java.util.Comparator
import java.util.HashSet
import java.util.List // This shadows List from kotlin.collections.
import java.util.Set
import org.springframework.samples.petclinic.model.NamedEntity
import org.springframework.samples.petclinic.model.Person
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table

@Entity
@Table(name = " vets")
open class Vet : Person() {

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "vet_specialties", joinColumns = [JoinColumn(name = "vet_id")], inverseJoinColumns = [JoinColumn(name = "specialty_id")])
    var specialties: Set<Specialty>? = null

}