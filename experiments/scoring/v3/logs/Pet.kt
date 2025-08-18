package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.NamedEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

/**
 * Simple business object representing a pet.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Wick Dynex
 */
@Entity
@Table(name = "pets")
class Pet : NamedEntity() {

    // Using field declarations for JPA annotations and property accessors for getters/setters.
    // This preserves the exact behavior while making it idiomatic Kotlin.

    // Birth date property with JPA annotations
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @Column(name = "birth_date")
    private var birthDate: LocalDate? = null

    // Type property with JPA annotations
    @ManyToOne
    @JoinColumn(name = "type_id")
    private var type: PetType? = null

    // Visits property with JPA annotations and order by clause
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "pet_id")
    @field:OrderBy("date ASC")
    private val visits: MutableSet<Visit> by Delegates.notNull()

    // Converters for birthDate property (matching Java's field-based annotations)
    fun setBirthDate(birthDate: LocalDate) {
        this.birthDate = birthDate
    }

    fun getBirthDate(): LocalDate? = birthDate

    // Converters for type property (matching Java's field-based annotations)
    fun setType(type: PetType) {
        this.type = type
    }

    fun getType(): PetType? = type

    // Method to add visits (converted from the provided function)
    fun addVisit(visit: Visit) {
        this.visits.add(visit)
    }

    // Method to get visits as an unmodifiable collection (converted from the provided function)
    fun getVisits(): Collection<Visit> = visits.toList()
}