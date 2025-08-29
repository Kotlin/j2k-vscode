
package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import java.util.Collection
import java.util.LinkedHashSet
import java.util.Set

import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.NamedEntity

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table

@Entity
@Table(name = "pets")
open class Pet : NamedEntity() {

    @field:Column(name = "birth_date")
    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    var birthDate: LocalDate? = null

    @field:ManyToOne
    @field:JoinColumn(name = "type_id")
    var type: PetType? = null

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "pet_id")
    @field:OrderBy("date ASC")
    val visits: MutableSet<Visit> = LinkedHashSet()

    fun addVisit(visit: Visit) {
        visits.add(visit)
    }
}
